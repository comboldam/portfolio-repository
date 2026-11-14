import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const errors = [];
const pages = new Map();
const textFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) { errors.push(`Symbolic link in public source: ${file}`); continue; }
    if (entry.isDirectory()) await walk(file);
    else if (/\.(html|css|js|mjs|json|svg|txt|xml)$/i.test(file)) textFiles.push(file);
  }
}
function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
  }
  return result;
}
function label(file) { return path.relative(root, file).split(path.sep).join('/'); }
function fail(file, message) { errors.push(`${label(file)}: ${message}`); }
await walk(root);
for (const file of textFiles) {
  const content = await readFile(file, 'utf8');
  if (/\b(?:TODO|FIXME|TBD|TBC|lorem ipsum|YOUR[-_ ]USERNAME|YOUR[-_ ]EMAIL)\b|https?:\/\/(?:www\.)?example\.com/i.test(content)) fail(file, 'Unresolved placeholder text.');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{35,}/.test(content)) fail(file, 'Possible credential in public source.');
  if (!file.endsWith('.html')) continue;
  const tags = [...content.matchAll(/<[a-z][^>]*>/gi)].map(match => ({ tag: match[0], attributes: attrs(match[0]) }));
  const ids = tags.map(({ attributes }) => attributes.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) fail(file, 'Duplicate HTML id.');
  if (!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(content)) fail(file, 'Missing HTML language.');
  if (!/<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title>/i.test(content)) fail(file, 'Missing page title.');
  if (!tags.some(({ tag, attributes }) => /^<meta\b/i.test(tag) && attributes.name?.toLowerCase() === 'description' && attributes.content?.trim())) fail(file, 'Missing meta description.');
  if ((content.match(/<h1\b/gi) ?? []).length !== 1) fail(file, 'Each page needs exactly one h1.');
  pages.set(file, { content, tags, ids: new Set(ids) });
}
if (!pages.has(path.join(root, 'index.html'))) errors.push('Missing site/index.html.');
async function checkReference(from, value, anchor = true) {
  const raw = value.trim().replace(/&amp;/g, '&');
  if (!raw || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(raw)) return;
  const hashIndex = raw.indexOf('#');
  const fragment = hashIndex >= 0 ? raw.slice(hashIndex + 1) : '';
  const pathname = (hashIndex >= 0 ? raw.slice(0, hashIndex) : raw).split('?')[0];
  let decoded, id;
  try { decoded = decodeURIComponent(pathname); id = decodeURIComponent(fragment); }
  catch { return fail(from, `Invalid URL encoding: ${raw}`); }
  let target = decoded ? path.resolve(decoded.startsWith('/') ? root : path.dirname(from), decoded.replace(/^\/+/, '')) : from;
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return fail(from, `Link leaves public directory: ${raw}`);
  try {
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    if (!(await stat(target)).isFile()) return fail(from, `Missing local file: ${raw}`);
  } catch { return fail(from, `Missing local file: ${raw}`); }
  if (anchor && id && pages.has(target) && !pages.get(target).ids.has(id)) fail(from, `Missing anchor: ${raw}`);
}
for (const [file, page] of pages) {
  for (const { attributes } of page.tags) {
    for (const name of ['href', 'src', 'poster']) if (attributes[name]) await checkReference(file, attributes[name]);
    if (attributes.srcset && !attributes.srcset.startsWith('data:')) {
      for (const candidate of attributes.srcset.split(',')) await checkReference(file, candidate.trim().split(/\s+/)[0], false);
    }
  }
}
for (const file of textFiles.filter(file => file.endsWith('.css'))) {
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) await checkReference(file, match[1], false);
}
if (errors.length) {
  console.error(`Portfolio check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Portfolio check passed: ${pages.size} HTML page(s), ${textFiles.length} text assets; local links, anchors, metadata, and basic public-source checks.`);
}

# Maharram Hajiyev - Portfolio

A dependency-free static portfolio prepared for `comboldam/portfolio-repository` on GitHub Pages.

## Pages

- `site/index.html`: animated homepage, served at the site root.
- `site/original.html`: preserved original homepage.
- `site/v2/index.html`: retained animated version route.
- `site/projects/`: detailed project stories for Quizzena, NOVA, and ASSISTments.

The animated homepage supports reduced motion and includes a motion toggle. All styling and scripts are local. Internal URLs are relative, so the site supports an account homepage or a repository subpath.

## Check

Use Node.js 20 or newer; no package installation is required.

```sh
npm run check
```

The check covers local links and anchors, required page metadata, duplicate IDs, and basic public-source patterns. It is not a complete accessibility or security audit.

## Publish

Create or select the intended portfolio repository in `comboldam`, push this directory to its `main` branch, and select **GitHub Actions** in the repository's **Settings > Pages**. The `Publish portfolio` workflow checks the files and publishes only `site/`.

The repository name is `portfolio-repository`. After a successful Pages deployment, the site will be at `https://comboldam.github.io/portfolio-repository/`.

This package contains only public website files and the minimal verification and deployment tooling. Deployment is complete only after the workflow succeeds and the live URL is verified.

# Image Chunk Swap Puzzle (Three.js)

Single puzzle mode in one Three.js web app:

1. Image Chunk Swap (row/column strip swapping over an image)

Features:

- Row and column handle swaps
- Click-to-select swapping (tap one heading, then another of same type)
- Drag-release swapping (press one heading, release on another heading)
- Undo (`Ctrl/Cmd+Z`)
- Move counter + correct/mismatch progress metrics
- Win overlay
- Image upload (`Image` file picker + `Use Demo`)

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Build

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

This repo includes a Pages deploy workflow:

- [.github/workflows/deploy-pages.yml](/Users/jmoffett/AppExperiments/.github/workflows/deploy-pages.yml)

To publish:

1. Push this project to a GitHub repo.
2. In GitHub: `Settings -> Pages -> Build and deployment -> Source`, choose `GitHub Actions`.
3. Push to `main` (or `master`) to trigger deploy.
4. Your site URL will be:
   - `https://<username>.github.io/<repo>/` for project repos, or
   - `https://<username>.github.io/` if the repo is named `<username>.github.io`.

The workflow auto-detects the repo type and sets the correct Vite `--base` path.

## Scramble

Each new image generates a fresh strong scramble for row and column strips.

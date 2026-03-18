# EduProc Crude Oil Distillation Simulator

This package is prepared for GitHub deployment.

## Publish to GitHub Pages

1. Create a new GitHub repository.
2. Upload all files from this package to the repository.
3. Push to the `main` branch.
4. In GitHub, open **Settings -> Pages**.
5. Set **Source** to **GitHub Actions**.
6. Wait for the workflow to finish.

Your live URL will be:

`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY_NAME/`

## Run locally

```bash
npm install
npm run dev
```

## Build locally

```bash
npm install
npm run build
```

## Notes

- The Vite base path is configured automatically during GitHub Actions deployment.
- You do not need to upload the `dist` folder manually.
- The deployment workflow builds and publishes the app for you.

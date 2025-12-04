Deploying FrontEnd to Vercel

This file contains quick steps to deploy the Vite-based `FrontEnd` folder to Vercel.

Prerequisites
- A GitHub account and a GitHub repo (or use the GitHub CLI `gh`).
- Vercel account (https://vercel.com).
- Node.js and npm installed locally.

1) Prepare the FrontEnd folder (if not already a repo)
If you want the `FrontEnd` folder to be the root of the Git repository (recommended for a single-site deploy):

```powershell
cd D:\Projects\FarmVisit\FrontEnd
# create .gitignore if needed
@'
node_modules/
.env
.env.local
dist/
'@ | Out-File -Encoding UTF8 .gitignore

git init
git add .
git commit -m "chore(frontend): add FrontEnd for Vercel deploy"
# Create a GitHub repo and add remote. Example (replace values):
git remote add origin https://github.com/<your-username>/<frontend-repo>.git
git branch -M main
git push -u origin main
```

Tip: If you prefer a monorepo (single repo with BackEnd + FrontEnd), push the whole project and set the "Root Directory" to `FrontEnd` in Vercel.

2) Web UI Deploy (recommended)
- Go to https://vercel.com and sign in with GitHub.
- Click "New Project" → choose the repo you pushed.
- When Vercel asks for configuration:
  - Root Directory: set to `FrontEnd` (if repository root is the monorepo). If you pushed only `FrontEnd` as repo root, leave empty.
  - Framework Preset: Vite (or let Vercel auto-detect)
  - Build Command: npm run build
  - Output Directory: dist
- Add Environment Variable(s):
  - Key: `VITE_API_URL`
  - Value: (your backend URL, e.g. https://overcontrite-oversteady-clifford.ngrok-free.dev or https://api.yourdomain.com)
  - Set for Preview/Production as appropriate.
- Deploy.

3) CLI Deploy (optional)
```powershell
# install vercel CLI once
npm i -g vercel
cd D:\Projects\FarmVisit\FrontEnd
vercel login
vercel --prod
# add environment var via CLI
vercel env add VITE_API_URL production
```

4) After deploy
- Visit the Vercel URL shown in the dashboard. Open DevTools → Network to verify API calls go to `VITE_API_URL`.
- If you change `VITE_API_URL` in the Vercel dashboard, redeploy the site (env vars are embedded at build time).

Notes
- `vercel.json` (included) forces single-page app behavior by routing all paths to `/index.html` and sets the static build target.
- Vite env variables must be prefixed `VITE_` to be embedded in the client bundle.
- If you need help creating the GitHub repo or pushing from this machine, I can provide exact commands or help prepare the repo files.

If you'd like, I can now:
- (A) Init a Git repo inside `FrontEnd` and commit these new files for you, or
- (B) Create a short shell script to push `FrontEnd` to a new GitHub repo via `gh repo create`.

Which would you like next?
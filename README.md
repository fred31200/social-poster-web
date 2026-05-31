# Social Poster — web

Personal social media publisher for **Aux graines du bien-être** — publish to Facebook, Instagram, LinkedIn and Threads from a single dashboard.

## 🚀 Deployment on Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create social-poster-web --private --source=. --push
# (or create the repo manually on github.com and `git push`)
```

### 2. Import the repo on Vercel

- Go to https://vercel.com/new
- Import `social-poster-web` from GitHub
- Framework preset: **Next.js** (auto-detected)
- Deploy

### 3. Add Vercel KV (free)

- In your Vercel project → **Storage** tab → **Create Database** → **KV**
- Connect it to the project (env vars are auto-injected)

### 4. Configure environment variables

In Vercel project → **Settings → Environment Variables**, add:

- `APP_PASSWORD` — your single-user login password
- `META_APP_ID` + `META_APP_SECRET`
- `THREADS_APP_ID` + `THREADS_APP_SECRET`
- `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET`
- (optional) `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET`

Redeploy after adding the env vars.

### 5. Update OAuth redirect URIs

In each social platform's dev console, add this URL as an authorized redirect:

```
https://YOUR-APP.vercel.app/api/oauth/callback
```

- **Meta** (Facebook + Instagram): https://developers.facebook.com/apps/ → Facebook Login → Settings → Valid OAuth Redirect URIs
- **Threads**: same Meta App → Use case "Threads API" → Redirect Callback URLs
- **LinkedIn**: https://www.linkedin.com/developers/apps/ → Auth → Authorized redirect URLs

## 💻 Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 (or http://[your-LAN-IP]:3000 from your phone on the same WiFi).

First access redirects to `/login` in **setup mode** — choose your password.

Credentials live in `.data/config.json` and accounts in `.data/social-poster-data.json` (both gitignored).

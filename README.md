# FitAI — Virtual Try-On

AI-powered clothing try-on app using IDM-VTON via Replicate.

## Deploy to Vercel (5 minutes)

### 1. Push to GitHub
- Create a free account at github.com
- Create a new repository called `fitai`
- Upload all these files to it

### 2. Deploy on Vercel
- Go to vercel.com and sign up free (use your GitHub account)
- Click "Add New Project" → import your `fitai` repo
- Click Deploy — Vercel auto-detects the config

### 3. Add your secret API key
- In Vercel dashboard → your project → Settings → Environment Variables
- Add a new variable:
  - **Name:** `REPLICATE_API_KEY`
  - **Value:** your Replicate key (e.g. `r8_xxxxxxxxxxxx`)
- Click Save, then go to Deployments → Redeploy

Your app is now live at `your-project.vercel.app` and your API key is 100% hidden from users.

## File structure
```
fitai/
├── api/
│   └── tryon.js        ← secure backend (key lives here, server-side only)
├── public/
│   └── index.html      ← the frontend app
└── vercel.json         ← routing config
```

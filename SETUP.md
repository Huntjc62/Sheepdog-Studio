# Sheepdog Studio — setup and launch

Sheepdog Studio is an AI marketing desk product by **Sheepdog Marketing**. This starter uses:
- **GitHub** for source control and deployment workflow
- **GitHub Pages** for the static React app
- **Supabase** for authentication, database, Row Level Security and Edge Functions
- **OpenAI API** inside a Supabase Edge Function (the secret never reaches the browser)

No Node.js installation is required on your computer to use the deployed app. GitHub Actions runs Node in the cloud to build it.

## 1. Create the GitHub repository
1. Create a new GitHub repository, e.g. `sheepdog-studio`.
2. Upload all project files to the repository root, or push this folder using Git.
3. Ensure the default branch is named `main`.
4. In `vite.config.js`, change `/REPOSITORY_NAME/` to `/<your-exact-github-repository-name>/`. Example: repository `sheepdog-studio` means base `/sheepdog-studio/`. If using a custom domain or `username.github.io` repository, use `/` instead.
5. In GitHub, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.

## 2. Create Supabase project
1. Create a project at https://supabase.com.
2. Open **Project Settings → API**.
3. Copy the Project URL and the publishable/anon key.
4. Open **SQL Editor**, paste `supabase/migrations/001_initial_schema.sql`, and run it.
5. In **Authentication → URL Configuration**, set Site URL to your GitHub Pages URL, e.g. `https://YOUR-USERNAME.github.io/sheepdog-studio/`.
6. Add the same URL to the Redirect URLs list. Also add `http://localhost:5173/**` for local testing if needed.
7. For production, configure your own domain here when you connect one.

## 3. Add GitHub Actions secrets
In the GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add:
- `VITE_SUPABASE_URL` = Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` = Supabase publishable/anon key

These are public-client configuration values; the anon key is safe to expose only because all tables have Row Level Security policies. Never put a Supabase service-role key or OpenAI API key in the frontend or GitHub Pages build.

## 4. Deploy the Supabase Edge Function
Install Supabase CLI on your computer (or use Supabase's supported CLI environment). Then run from this project directory:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
supabase functions deploy marketing-agent
```

The Edge Function uses the caller's Supabase access token, validates the signed-in user, reads their own business profile, spends credits through a database function, and stores the generation. The OpenAI key stays in Supabase secrets.

If your Supabase project has JWT verification enabled for functions (default), keep it enabled. Do not deploy this function with public unauthenticated access.

## 5. Deploy the website
1. Push your files to the `main` branch.
2. GitHub Actions builds the app and deploys it to GitHub Pages.
3. Visit the Pages URL from **Settings → Pages**.
4. Sign up using an email and password. If email confirmation is enabled, confirm your email before signing in.
5. Complete your business profile, then create your first piece of marketing content.

## 6. Local preview (optional)
You can still develop locally if you want, but it is not needed for normal use:
```bash
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Current MVP scope
- Supabase email/password sign-up and sign-in
- One business profile per user
- RLS-protected content history
- Eight AI marketing workflows
- AI generation through a Supabase Edge Function
- Server-side credit spending and generation storage
- Content copy/download
- Responsive Sheepdog-branded interface

## Important production work before taking subscriptions
This is an MVP, not a fully hardened commercial SaaS. Before charging customers:
1. Add Stripe Checkout, signed webhooks and subscription state; allocate/reset credits from verified subscription events.
2. Add password reset, email change and account deletion flows.
3. Add rate limiting, bot/abuse controls, request size limits and monitoring.
4. Add storage for uploaded logos and brand assets with per-user access policies.
5. Add actual image generation integration. The current design tool returns a creative brief and image prompt, not a rendered image.
6. Add real website crawling/auditing with safe URL validation and SSRF protections; currently it only analyses details the user supplies.
7. Add privacy policy, terms, cookie notice where required, retention/deletion procedures and UK GDPR review.
8. Review marketing claims for regulated industries and require user approval before external publication.
9. Consider custom domain and GitHub Pages SPA routing limitations. For a polished production domain, Cloudflare Pages or Vercel can also deploy directly from this same GitHub repository.

## Brand fonts
CSS uses local font families `Bauhaus 93` for headings and `HP Simplified` for body copy. These proprietary fonts are not bundled. Install licensed font files on the user's device or add licensed WOFF2 files to `public/fonts` and configure `@font-face` paths in `src/styles.css`. Fallbacks are provided.

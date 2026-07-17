# DSE Group — dsegroup.ai

Static marketing site for DSE Group. Black/white/gold brand system from the logo,
Archivo + Inter type, dark neural-network hero, light content sections.

## Structure
- `index.html` — Digital Brains & AI Operating Systems (homepage)
- `voice-ai.html` — Voice AI & phone agents
- `conversational-ai.html` — Conversational AI & fan companions
- `blog/` — Insights (daily posts land in `blog/posts/`)
- `contact.html` — contact form
- `assets/` — shared CSS, JS (neural hero animation, nav), brand images
- `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD in every page — SEO + LLM discovery
- `.htaccess` — HTTPS + non-www redirects, 404 page, caching

## Deploy (GitHub → Hostinger)
1. Push this folder to a GitHub repo (branch `main`).
2. In the repo: Settings → Secrets and variables → Actions, add:
   - `HOSTINGER_FTP_SERVER` (e.g. `ftp.dsegroup.ai` — from hPanel → Files → FTP Accounts)
   - `HOSTINGER_FTP_USERNAME`
   - `HOSTINGER_FTP_PASSWORD`
3. Every push to `main` auto-deploys to `public_html/` via `.github/workflows/deploy.yml`.

## Contact form
The form posts to FormSubmit (`https://formsubmit.co/hello@dsegroupae.com`) — no backend needed.
Replace `hello@dsegroupae.com` in `contact.html` with your real inbox. The first submission
sends you a one-time confirmation email; confirm it and the form is live.

## Daily blog (cron job)
The blog is structured for automated publishing. Your daily job should:
1. Generate a new post HTML file into `blog/posts/` (copy
   `what-is-an-ai-operating-system.html` as the template — it includes full
   BlogPosting schema, OG tags, and canonical URL; update title, description,
   date, slug, and body).
2. Insert a matching card at the `<!-- POSTS:START -->` marker in `blog/index.html`.
3. Append a `<url>` entry to `sitemap.xml`.
4. Commit and push to `main` — the GitHub Action deploys it automatically.
   (Running the job as a GitHub Actions `schedule:` cron is the cleanest setup,
   since the push itself triggers the deploy.)

## SEO / LLM discovery checklist (already wired in)
- Unique titles, meta descriptions, canonicals, and Open Graph on every page
- JSON-LD: Organization + ProfessionalService (San Diego, CA) + FAQ on home;
  Service schema on both service pages; Blog/BlogPosting on the blog; ContactPage on contact
- `llms.txt` company summary for AI assistants; AI crawlers allowed in `robots.txt`
- `sitemap.xml` referenced from `robots.txt`

After first deploy: submit `https://dsegroup.ai/sitemap.xml` in Google Search Console
and Bing Webmaster Tools.

# The Langford — Website

Marketing website for The Langford, a waterfront apartment community in Newport News, VA. Static HTML/CSS/JS front end with a Cloudflare Pages Function handling interest-list submissions.

## Structure

```
/
├── index.html            Home
├── apartments.html        Floor plans (studio–3BR)
├── amenities.html         Community, in-home, and outdoor amenities
├── gallery.html            Filterable photo gallery + lightbox
├── location.html           Map + location advantages
├── contact.html            Contact info + interest list form
├── robots.txt
├── sitemap.xml
├── css/
│   ├── base.css            Reset, tokens, typography
│   ├── layout.css          Hero, section, grid structure
│   ├── components.css      Nav, buttons, cards, forms, motifs
│   └── pages.css           Page-specific refinements
├── js/
│   ├── nav.js               Sticky header + mobile menu
│   ├── animations.js        Scroll-reveal (IntersectionObserver)
│   ├── tabs.js               Accessible tabs (Apartments page)
│   ├── gallery.js            Gallery filter + lightbox
│   ├── form.js                Interest-list validation + submission
│   └── main.js                Footer year, misc init
├── assets/img/              Logo + placeholder photography
└── functions/api/
    └── interest-list.js     Serverless submission handler (Cloudflare Pages Functions)
```

## Placeholder photography

All photography in `assets/img/` is generated placeholder artwork (gradient + skyline motif in brand colors), standing in for real site and architectural photography. Replace these files with final photography before launch — file names are referenced directly in the HTML, so a same-name swap requires no code changes.

## Deploying the interest-list form

The form posts to `/api/interest-list`, implemented as a Cloudflare Pages Function (`functions/api/interest-list.js`). To deploy on Cloudflare Pages:

1. Push this project to a Git repository and connect it to Cloudflare Pages (framework preset: **None** — static site).
2. In your Pages project settings, add these **environment variables / secrets**:
   - `RESEND_API_KEY` — your [Resend](https://resend.com) API key
   - `TURNSTILE_SECRET_KEY` — your Cloudflare Turnstile secret key
   - `LEASING_EMAIL` — inbox that receives new signups (defaults to `leasing@thelangford.example`)
3. Replace the Turnstile **site key** placeholder in `contact.html` (`data-sitekey="1x00000000000000000000AA"`, currently Cloudflare's public test key) with your real site key.
4. (Optional) Bind a KV namespace named `RATE_LIMIT_KV` to the Pages Function for basic per-IP rate limiting on submissions. The function fails open (skips rate limiting) if it isn't bound, so this is not required to launch.
5. Update the `from` address in `interest-list.js` once your sending domain is verified with Resend.

No API keys are ever present in client-side code — the Turnstile site key is public by design (it identifies your site to Cloudflare, and Turnstile validation still requires the private secret key server-side).

## Local preview

This is a static site with no build step. Serve the folder with any static file server, e.g.:

```bash
npx serve .
```

The `/api/interest-list` endpoint will only respond in a Cloudflare Pages (or `wrangler pages dev`) environment, since it relies on Pages Functions and bound secrets.

## Content notes

- No leasing pricing is published anywhere on the site, per requirements — floor plan pages note that pricing will follow the interest list.
- Floor plans are visual placeholders pending final architectural release.
- Replace `https://www.thelangfordnn.example` throughout (canonical tags, Open Graph, sitemap) with the live production domain before launch.

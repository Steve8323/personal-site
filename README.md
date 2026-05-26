# alexander-chen.vercel.app

A multi-page personal site with a hidden admin editor. Static HTML — hosts on
GitHub Pages or Vercel with zero build step.

## Pages

| URL | What |
|---|---|
| `/` | Home — hero + intro + tour cards to other pages |
| `/math.html` | Competition record, research, reading list |
| `/projects.html` | Projects (textbook, SSAMO, etc.) |
| `/recommendations.html` | Rated book / video / etc. recommendations |
| `/beyond.html` | Beyond math: swimming, piano, skiing, DECA |
| `/sessions.html` | "Problem Sessions" — apply via the form (opens email client) |
| `/admin.html` | **Hidden** editor (passphrase-gated) |

All content lives in `data.json`. Each page reads from it via `shell.js`.

## The hidden admin

Three ways to reach it from the public site:

1. Visit `/admin.html` directly
2. Press `Cmd/Ctrl + Shift + .`
3. Triple-click the initials in the top-left nav

Default passphrase: **`changeme`** (change it from the **Passphrase** section in the admin sidebar)

### What you can edit

The admin sidebar is split into sections:

- **Identity** — name, initials, subtitle, intro paragraph
- **Sections** — *toggles* for show/hide of each page (Math, Projects, Recs, Beyond, Sessions). Hidden pages disappear from the nav but still work via direct URL.
- **Writing link** — adds a "Substack" (or any label) pill to the top nav
- **Home page** — the two-column blurbs on the home page
- **Hero tags** — the pills under the intro
- **About** / **Competitions** / **Research** / **Reading**
- **Projects** — add/edit/reorder
- **Recommendations** — with star ratings + categories
- **Beyond math** — swimming etc.
- **Sessions page** — every bit of copy on the Problem Sessions page (title, subtitle, house rules, level options, time windows, success message)
- **Applicants** — anyone who submits the Sessions form has their info saved in your browser's localStorage; you can view it here
- **Contact** — email + GitHub/AoPS/etc. links
- **Passphrase** — change the admin passphrase

## Publishing flow

Edits save instantly to your browser's localStorage (so you see them on
preview), but to publish them for visitors:

1. In the admin, click **Export data.json**
2. Open https://github.com/Steve8323/personal-site/blob/main/data.json on GitHub
3. Click the pencil ✏️ icon → paste the new contents → commit
4. Vercel auto-deploys in ~10 seconds

## Security note

The passphrase is checked entirely in the browser, so a savvy visitor could
bypass it via DevTools. Treat it as obfuscation, not security. Don't put
truly private info in `data.json`. The actual auth that matters is your
GitHub account — only people with repo write access can change what gets
published.

## The Sessions form

The form on `/sessions.html` doesn't have a real backend. When someone
submits, two things happen:

1. Their info is logged to `localStorage` under `sessionApps.v1` (visible
   in the **Applicants** section of the admin — but only on the browser
   they submitted from, since static sites have no shared store)
2. Their email client opens with a pre-filled message to whatever email
   address is set in **Contact** → **Email**

If you want real persistence later, the natural upgrade is a Vercel
serverless function that writes to Vercel KV or sends via Resend.

## Local dev

```sh
python3 -m http.server 8000
# visit http://localhost:8000
```

## Forgot the passphrase

Open devtools on `admin.html` and run:
```js
localStorage.removeItem('sitePwHash.v1')
```
It resets to `changeme`.

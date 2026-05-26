# Personal site

A simple, single-page personal site you can host for free on **GitHub Pages**.
All content lives in `data.json` so you can edit it from the built-in admin panel
without touching code.

## Files

- `index.html` / `styles.css` / `app.js` — the public site
- `data.json` — all the content (name, projects, achievements, etc.)
- `admin.html` / `admin.js` — hidden editor with passphrase gate

## Hosting it on GitHub Pages

1. Create a new repo on GitHub (e.g. `your-username.github.io` for the simplest URL, or any other name).
2. Upload the contents of this folder to the repo.
3. In the repo's **Settings → Pages**, set "Source" to `Deploy from a branch` and pick `main` / `(root)`.
4. Your site goes live at `https://<username>.github.io/` (or `https://<username>.github.io/<repo>/` for a non-default repo).

## The hidden admin panel

The admin page is at `admin.html` (e.g. `https://you.github.io/admin.html`). There is no
visible link to it. Three ways to open it from the main site:

- **Visit `/admin.html`** directly
- **Keyboard shortcut**: `Cmd/Ctrl + Shift + .`
- **Triple-click the initials** in the top-left of the nav

### Default passphrase

`changeme`

After unlocking, scroll to the bottom of the editor and use **Change passphrase** to set
your own. The new passphrase is stored as a SHA-256 hash in your browser's localStorage.

> ⚠️ **About "security":** this is a static site, so the passphrase check happens in
> the browser. It's enough to keep casual visitors out, but anyone with web-dev
> skills can bypass it by reading the JS. Don't put truly private info on the site.

## How edits work

The admin panel saves your changes to your browser's localStorage immediately.
This means **edits show up only in your own browser** until you publish them.

To publish your edits for everyone:

1. In the admin panel, click **Export data.json**.
2. Upload the downloaded `data.json` into your GitHub repo (replacing the old one).
   - Easiest way: on github.com, navigate to `data.json`, click the pencil ✏️ icon,
     paste the new contents, and commit.
3. GitHub Pages will redeploy in ~30 seconds and the public site will reflect the changes.

## Adding projects / slide links

In the admin panel's **Projects** section, each project has:

- Title
- Body (short description; HTML allowed)
- Link URL (Google Slides share link, GitHub repo, AoPS thread, PDF, etc.)
- Link label (e.g. "View slides →")

Use **Move up / Move down** to reorder them.

## Running locally

Open `index.html` in a browser — that's it. (For best results, serve the folder
through a tiny local server so `fetch('data.json')` works without CORS issues:
`python3 -m http.server 8000` then visit http://localhost:8000)

## Resetting the admin

If you forget your custom passphrase, open the browser devtools console on
`admin.html` and run:

```js
localStorage.removeItem('sitePwHash.v1')
```

The passphrase resets to `changeme`.

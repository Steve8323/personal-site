// Shared shell: loads data.json, builds nav + footer, and exposes window.SITE
// for page-specific scripts.

(async function () {
  const LOCAL_KEY = 'siteData.v1';

  async function loadData() {
    const local = localStorage.getItem(LOCAL_KEY);
    if (local) {
      try { return JSON.parse(local); } catch (e) { /* fall through */ }
    }
    const res = await fetch('data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load data.json');
    return res.json();
  }

  const data = await loadData();
  window.SITE = data;

  const sections = data.sections || {};
  const pages = [
    { key: 'home', href: 'index.html', label: 'Home', always: true },
    { key: 'math', href: 'math.html', label: 'Math' },
    { key: 'projects', href: 'projects.html', label: 'Projects' },
    { key: 'recommendations', href: 'recommendations.html', label: 'Recs' },
    { key: 'beyond', href: 'beyond.html', label: 'Beyond' },
    { key: 'sessions', href: 'sessions.html', label: 'Sessions' }
  ];

  const currentPage = document.body.dataset.page || 'home';
  document.title = `${data.name || 'Personal Site'}${currentPage !== 'home' ? ' · ' + (pages.find(p => p.key === currentPage)?.label || '') : ''}`;

  // Build nav
  const nav = document.getElementById('nav');
  if (nav) {
    nav.innerHTML = '';
    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.id = 'brand';
    brand.href = 'index.html';
    brand.textContent = data.initials || '·';
    nav.appendChild(brand);

    const links = document.createElement('div');
    links.className = 'nav-links';

    pages.forEach((p) => {
      if (!p.always && sections[p.key] === false) return;
      const a = document.createElement('a');
      a.href = p.href;
      a.textContent = p.label;
      if (p.key === currentPage) a.className = 'active';
      links.appendChild(a);
    });

    if (data.writing && data.writing.url) {
      const w = document.createElement('a');
      w.href = data.writing.url;
      w.textContent = data.writing.label || 'Writing';
      w.target = '_blank';
      w.rel = 'noopener';
      w.id = 'nav-writing';
      links.appendChild(w);
    }

    nav.appendChild(links);
  }

  // Build footer
  const footer = document.getElementById('footer');
  if (footer) {
    const p = document.createElement('p');
    const yearSpan = document.createElement('span');
    yearSpan.textContent = new Date().getFullYear();
    p.appendChild(document.createTextNode('© '));
    p.appendChild(yearSpan);
    p.appendChild(document.createTextNode(' ' + (data.name || '') + ' · '));
    if (data.contact && data.contact.email) {
      const a = document.createElement('a');
      a.href = `mailto:${data.contact.email}`;
      a.textContent = data.contact.email;
      p.appendChild(a);
    }
    footer.innerHTML = '';
    footer.appendChild(p);
  }

  // Hidden admin triggers
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '.') {
      window.location.href = 'admin.html';
    }
  });
  let clicks = 0, t;
  const brandEl = document.getElementById('brand');
  if (brandEl) {
    brandEl.addEventListener('click', (e) => {
      clicks++;
      clearTimeout(t);
      t = setTimeout(() => { clicks = 0; }, 600);
      if (clicks >= 3) {
        e.preventDefault();
        clicks = 0;
        window.location.href = 'admin.html';
      }
    });
  }

  // Tell page-specific scripts that data is loaded
  document.dispatchEvent(new CustomEvent('site:ready', { detail: data }));
})().catch((err) => {
  console.error(err);
  document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">Could not load site data. Check that <code>data.json</code> is present.</p>';
});

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

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const c of children) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function render(data) {
    document.title = `${data.name || 'Personal Site'}`;
    document.getElementById('brand').textContent = data.initials || '·';
    document.getElementById('hero-name').textContent = data.name || '';
    document.getElementById('hero-subtitle').textContent = data.subtitle || '';
    document.getElementById('hero-tagline').innerHTML = data.tagline || '';
    document.getElementById('footer-name').textContent = data.name || '';
    document.getElementById('year').textContent = new Date().getFullYear();

    const tagsHost = document.getElementById('hero-tags');
    tagsHost.innerHTML = '';
    (data.heroTags || []).forEach((t) => tagsHost.appendChild(el('span', { textContent: t })));

    const aboutHost = document.getElementById('about-body');
    aboutHost.innerHTML = '';
    (data.about || []).forEach((p) => {
      const para = document.createElement('p');
      para.innerHTML = p;
      aboutHost.appendChild(para);
    });

    const compHost = document.getElementById('competition-list');
    compHost.innerHTML = '';
    (data.competition || []).forEach((line) => {
      const li = document.createElement('li');
      li.innerHTML = line;
      compHost.appendChild(li);
    });

    if (data.research) {
      document.getElementById('research-title').textContent = data.research.title || 'Research';
      document.getElementById('research-body').innerHTML = data.research.body || '';
      document.getElementById('research-note').innerHTML = data.research.note || '';
    }

    const readHost = document.getElementById('reading-list');
    readHost.innerHTML = '';
    (data.reading || []).forEach((line) => {
      const li = document.createElement('li');
      li.innerHTML = line;
      readHost.appendChild(li);
    });

    const projHost = document.getElementById('projects-list');
    projHost.innerHTML = '';
    (data.projects || []).forEach((p) => {
      const art = document.createElement('article');
      art.className = 'project';
      const h = document.createElement('h3');
      h.textContent = p.title || '';
      art.appendChild(h);
      const body = document.createElement('p');
      body.innerHTML = p.body || '';
      art.appendChild(body);
      if (p.link) {
        const a = document.createElement('a');
        a.href = p.link;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'project-link';
        a.textContent = (p.linkLabel || 'View →');
        art.appendChild(a);
      }
      projHost.appendChild(art);
    });

    const actHost = document.getElementById('activities-list');
    actHost.innerHTML = '';
    (data.activities || []).forEach((a) => {
      const card = document.createElement('div');
      card.className = 'card';
      const h = document.createElement('h3');
      h.textContent = a.title || '';
      card.appendChild(h);
      const p = document.createElement('p');
      p.innerHTML = a.body || '';
      card.appendChild(p);
      actHost.appendChild(card);
    });

    if (data.contact) {
      document.getElementById('contact-blurb').textContent = data.contact.blurb || '';
      const linkHost = document.getElementById('contact-links');
      linkHost.innerHTML = '';
      if (data.contact.email) {
        const a = document.createElement('a');
        a.href = `mailto:${data.contact.email}`;
        a.textContent = data.contact.email;
        linkHost.appendChild(a);
      }
      (data.contact.links || []).forEach((l) => {
        if (linkHost.children.length) {
          const dot = document.createElement('span');
          dot.className = 'dot';
          dot.textContent = '·';
          linkHost.appendChild(dot);
        }
        const a = document.createElement('a');
        a.href = l.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = l.label;
        linkHost.appendChild(a);
      });
    }
  }

  try {
    const data = await loadData();
    render(data);
  } catch (e) {
    console.error(e);
    document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">Could not load site data. Check that <code>data.json</code> is present.</p>';
  }

  // Hidden admin access:
  //   1. Visit /admin.html directly
  //   2. Press Cmd/Ctrl + Shift + . on this page
  //   3. Triple-click the brand "Y.N." in the top nav
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '.') {
      window.location.href = 'admin.html';
    }
  });
  let brandClicks = 0;
  let brandTimer;
  const brand = document.getElementById('brand');
  if (brand) {
    brand.addEventListener('click', (e) => {
      brandClicks++;
      clearTimeout(brandTimer);
      brandTimer = setTimeout(() => { brandClicks = 0; }, 600);
      if (brandClicks >= 3) {
        e.preventDefault();
        brandClicks = 0;
        window.location.href = 'admin.html';
      }
    });
  }
})();

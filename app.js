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

    // Writing / Substack nav link
    const navWriting = document.getElementById('nav-writing');
    if (navWriting) {
      if (data.writing && data.writing.url) {
        navWriting.href = data.writing.url;
        navWriting.textContent = data.writing.label || 'Writing';
        navWriting.style.display = '';
      } else {
        navWriting.style.display = 'none';
      }
    }

    // Recommendations
    const recHost = document.getElementById('rec-list');
    if (recHost) {
      recHost.innerHTML = '';
      (data.recommendations || []).forEach((r) => {
        const card = document.createElement('div');
        card.className = 'rec';
        const head = document.createElement('div');
        head.className = 'rec-head';
        const cat = document.createElement('span');
        cat.className = 'rec-cat';
        cat.textContent = r.category || '';
        head.appendChild(cat);
        const stars = document.createElement('span');
        stars.className = 'rec-stars';
        const n = Math.max(0, Math.min(5, Number(r.rating) || 0));
        stars.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
        stars.setAttribute('aria-label', `${n} out of 5`);
        head.appendChild(stars);
        card.appendChild(head);

        const titleEl = document.createElement(r.link ? 'a' : 'h3');
        if (r.link) {
          titleEl.href = r.link;
          titleEl.target = '_blank';
          titleEl.rel = 'noopener';
          titleEl.className = 'rec-title-link';
        } else {
          titleEl.className = 'rec-title';
        }
        titleEl.textContent = r.title || '';
        card.appendChild(titleEl);

        if (r.note) {
          const note = document.createElement('p');
          note.className = 'rec-note';
          note.innerHTML = r.note;
          card.appendChild(note);
        }
        recHost.appendChild(card);
      });
    }

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

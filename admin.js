(async function () {
  const LOCAL_KEY = 'siteData.v1';
  const AUTH_KEY = 'siteAuth.v1';
  const PW_HASH_KEY = 'sitePwHash.v1';

  // Default passphrase: "changeme"
  // SHA-256 of "changeme":
  const DEFAULT_PW_HASH = '057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86';

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function getActiveHash() {
    return localStorage.getItem(PW_HASH_KEY) || DEFAULT_PW_HASH;
  }

  // ---------- gate ----------
  const gate = document.getElementById('gate');
  const editor = document.getElementById('editor');
  const gateForm = document.getElementById('gate-form');
  const gateInput = document.getElementById('gate-input');
  const gateErr = document.getElementById('gate-err');

  function isAuthed() {
    const t = sessionStorage.getItem(AUTH_KEY);
    return t === '1';
  }

  async function tryUnlock(pw) {
    const h = await sha256(pw);
    if (h === getActiveHash()) {
      sessionStorage.setItem(AUTH_KEY, '1');
      return true;
    }
    return false;
  }

  if (isAuthed()) {
    showEditor();
  } else {
    gate.style.display = '';
  }

  gateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    gateErr.textContent = '';
    const ok = await tryUnlock(gateInput.value);
    if (ok) {
      gate.style.display = 'none';
      showEditor();
    } else {
      gateErr.textContent = 'Wrong passphrase.';
      gateInput.select();
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  });

  // ---------- editor ----------
  let data = null;

  async function loadInitial() {
    const local = localStorage.getItem(LOCAL_KEY);
    if (local) {
      try { return JSON.parse(local); } catch (e) { /* fall through */ }
    }
    const res = await fetch('data.json', { cache: 'no-cache' });
    return res.json();
  }

  async function showEditor() {
    editor.style.display = '';
    if (!data) {
      try { data = await loadInitial(); }
      catch (e) { alert('Could not load data.json'); return; }
    }
    renderForm();
  }

  function setStatus(text, saved = false) {
    const s = document.getElementById('save-status');
    s.textContent = text;
    s.classList.toggle('saved', saved);
  }

  function persist() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    setStatus('Saved locally', true);
    setTimeout(() => setStatus('Saved locally'), 1500);
  }

  function field(label, value, onChange, opts = {}) {
    const wrap = document.createElement('label');
    wrap.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
    wrap.appendChild(l);
    const input = document.createElement(opts.long ? 'textarea' : 'input');
    if (!opts.long) input.type = 'text';
    input.value = value || '';
    if (opts.rows) input.rows = opts.rows;
    input.addEventListener('input', () => { onChange(input.value); persist(); });
    wrap.appendChild(input);
    if (opts.hint) {
      const h = document.createElement('div');
      h.className = 'hint';
      h.textContent = opts.hint;
      wrap.appendChild(h);
    }
    return wrap;
  }

  function section(title) {
    const s = document.createElement('section');
    s.className = 'editor-section';
    const h = document.createElement('h3');
    h.textContent = title;
    s.appendChild(h);
    return s;
  }

  function btn(label, onClick, cls = 'btn secondary') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderForm() {
    const host = document.getElementById('form-host');
    host.innerHTML = '';

    // ---- Identity ----
    const idSec = section('Identity');
    idSec.appendChild(field('Name', data.name, (v) => (data.name = v)));
    idSec.appendChild(field('Initials (top-left nav)', data.initials, (v) => (data.initials = v)));
    idSec.appendChild(field('Subtitle (above name)', data.subtitle, (v) => (data.subtitle = v)));
    idSec.appendChild(field('Tagline (HTML allowed)', data.tagline, (v) => (data.tagline = v), { long: true, rows: 3 }));
    host.appendChild(idSec);

    // ---- Hero tags ----
    const tagsSec = section('Hero tags (under the tagline)');
    data.heroTags = data.heroTags || [];
    function renderTags() {
      [...tagsSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.heroTags.forEach((t, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Tag', t, (v) => { data.heroTags[i] = v; }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Remove', () => { data.heroTags.splice(i, 1); persist(); renderTags(); }, 'btn danger'));
        item.appendChild(acts);
        tagsSec.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add tag', () => { data.heroTags.push(''); persist(); renderTags(); }, 'btn'));
      tagsSec.appendChild(add);
    }
    renderTags();
    host.appendChild(tagsSec);

    // ---- About ----
    const aboutSec = section('About paragraphs');
    data.about = data.about || [];
    function renderAbout() {
      [...aboutSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.about.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field(`Paragraph ${i + 1}`, p, (v) => { data.about[i] = v; }, { long: true, rows: 4 }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Remove', () => { data.about.splice(i, 1); persist(); renderAbout(); }, 'btn danger'));
        item.appendChild(acts);
        aboutSec.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add paragraph', () => { data.about.push(''); persist(); renderAbout(); }, 'btn'));
      aboutSec.appendChild(add);
    }
    renderAbout();
    host.appendChild(aboutSec);

    // ---- Competition list ----
    const compSec = section('Competition highlights');
    data.competition = data.competition || [];
    function renderComp() {
      [...compSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.competition.forEach((line, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Line (HTML allowed)', line, (v) => { data.competition[i] = v; }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Remove', () => { data.competition.splice(i, 1); persist(); renderComp(); }, 'btn danger'));
        item.appendChild(acts);
        compSec.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add line', () => { data.competition.push(''); persist(); renderComp(); }, 'btn'));
      compSec.appendChild(add);
    }
    renderComp();
    host.appendChild(compSec);

    // ---- Research ----
    const resSec = section('Research');
    data.research = data.research || { title: '', body: '', note: '' };
    resSec.appendChild(field('Title', data.research.title, (v) => (data.research.title = v)));
    resSec.appendChild(field('Body (HTML allowed)', data.research.body, (v) => (data.research.body = v), { long: true, rows: 5 }));
    resSec.appendChild(field('Italic note', data.research.note, (v) => (data.research.note = v), { long: true, rows: 3 }));
    host.appendChild(resSec);

    // ---- Reading list ----
    const readSec = section("What I'm reading");
    data.reading = data.reading || [];
    function renderRead() {
      [...readSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.reading.forEach((line, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Line (HTML allowed)', line, (v) => { data.reading[i] = v; }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Remove', () => { data.reading.splice(i, 1); persist(); renderRead(); }, 'btn danger'));
        item.appendChild(acts);
        readSec.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add line', () => { data.reading.push(''); persist(); renderRead(); }, 'btn'));
      readSec.appendChild(add);
    }
    renderRead();
    host.appendChild(readSec);

    // ---- Projects ----
    const projSec = section('Projects');
    data.projects = data.projects || [];
    function renderProj() {
      [...projSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.projects.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Title', p.title, (v) => { p.title = v; }));
        item.appendChild(field('Body (HTML allowed)', p.body, (v) => { p.body = v; }, { long: true, rows: 4 }));
        item.appendChild(field('Link URL (slides, PDF, GitHub, etc.)', p.link, (v) => { p.link = v; }, { hint: 'e.g. Google Slides share link, AoPS thread, PDF in repo' }));
        item.appendChild(field('Link label', p.linkLabel, (v) => { p.linkLabel = v; }, { hint: 'e.g. "View slides →" — defaults to "View →"' }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Move up', () => { if (i > 0) { [data.projects[i - 1], data.projects[i]] = [data.projects[i], data.projects[i - 1]]; persist(); renderProj(); } }));
        acts.appendChild(btn('Move down', () => { if (i < data.projects.length - 1) { [data.projects[i + 1], data.projects[i]] = [data.projects[i], data.projects[i + 1]]; persist(); renderProj(); } }));
        acts.appendChild(btn('Remove', () => { data.projects.splice(i, 1); persist(); renderProj(); }, 'btn danger'));
        item.appendChild(acts);
        projSec.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add project', () => { data.projects.push({ title: 'New project', body: '', link: '', linkLabel: '' }); persist(); renderProj(); }, 'btn'));
      projSec.appendChild(add);
    }
    renderProj();
    host.appendChild(projSec);

    // ---- Activities ----
    const actSec = section('Beyond math');
    data.activities = data.activities || [];
    function renderAct() {
      [...actSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.activities.forEach((a, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Title', a.title, (v) => { a.title = v; }));
        item.appendChild(field('Body', a.body, (v) => { a.body = v; }, { long: true, rows: 3 }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Remove', () => { data.activities.splice(i, 1); persist(); renderAct(); }, 'btn danger'));
        item.appendChild(acts);
        actSec.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add activity', () => { data.activities.push({ title: '', body: '' }); persist(); renderAct(); }, 'btn'));
      actSec.appendChild(add);
    }
    renderAct();
    host.appendChild(actSec);

    // ---- Contact ----
    const cSec = section('Contact');
    data.contact = data.contact || { blurb: '', email: '', links: [] };
    cSec.appendChild(field('Blurb', data.contact.blurb, (v) => (data.contact.blurb = v)));
    cSec.appendChild(field('Email', data.contact.email, (v) => (data.contact.email = v)));
    const linksWrap = document.createElement('div');
    function renderLinks() {
      linksWrap.innerHTML = '';
      data.contact.links.forEach((l, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Label', l.label, (v) => { l.label = v; }));
        item.appendChild(field('URL', l.url, (v) => { l.url = v; }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Remove', () => { data.contact.links.splice(i, 1); persist(); renderLinks(); }, 'btn danger'));
        item.appendChild(acts);
        linksWrap.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add link', () => { data.contact.links.push({ label: '', url: '' }); persist(); renderLinks(); }, 'btn'));
      linksWrap.appendChild(add);
    }
    renderLinks();
    cSec.appendChild(linksWrap);
    host.appendChild(cSec);

    // ---- Password ----
    const pSec = section('Change passphrase (this browser only)');
    const pInput = document.createElement('input');
    pInput.type = 'password';
    pInput.placeholder = 'New passphrase';
    pInput.style.cssText = 'width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:10px;';
    pSec.appendChild(pInput);
    const pStatus = document.createElement('div');
    pStatus.className = 'hint';
    pStatus.textContent = 'Stored as SHA-256 hash in this browser. Clearing browser data resets it to the default ("changeme").';
    pSec.appendChild(pStatus);
    const pBtn = btn('Update passphrase', async () => {
      if (!pInput.value || pInput.value.length < 4) {
        pStatus.textContent = 'Pick something at least 4 characters.';
        return;
      }
      const h = await sha256(pInput.value);
      localStorage.setItem(PW_HASH_KEY, h);
      pInput.value = '';
      pStatus.textContent = 'Passphrase updated in this browser.';
    }, 'btn');
    pSec.appendChild(pBtn);
    host.appendChild(pSec);
  }

  // ---- Toolbar actions ----
  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    document.body.appendChild(a); a.click(); a.remove();
    setStatus('Downloaded — replace data.json in repo', true);
  });

  document.getElementById('btn-reload').addEventListener('click', async () => {
    if (!confirm('Discard local edits and reload data.json?')) return;
    localStorage.removeItem(LOCAL_KEY);
    data = null;
    await showEditor();
    setStatus('Reloaded from data.json', true);
  });

  document.getElementById('btn-preview').addEventListener('click', () => {
    window.open('index.html', '_blank');
  });
})();

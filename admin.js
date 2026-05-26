(async function () {
  const LOCAL_KEY = 'siteData.v1';
  const TOKEN_KEY = 'siteAdminToken.v1';
  const APPS_LOCAL_KEY = 'sessionApps.v1';

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function getToken() { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); }

  async function apiVerify(passphrase) {
    const r = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase })
    });
    if (r.status === 200) {
      const j = await r.json();
      return { ok: true, token: j.token };
    }
    if (r.status === 500) {
      const j = await r.json().catch(() => ({}));
      return { ok: false, configError: j.error || 'server not configured' };
    }
    return { ok: false };
  }

  async function apiListApps() {
    const token = getToken();
    if (!token) throw new Error('no token');
    const r = await fetch('/api/sessions/list', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.status === 401) { sessionStorage.removeItem(TOKEN_KEY); throw new Error('unauthorized'); }
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || `error ${r.status}`);
    }
    return r.json();
  }

  async function apiClearApps() {
    const token = getToken();
    if (!token) throw new Error('no token');
    const r = await fetch('/api/sessions/clear', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || `error ${r.status}`);
    }
    return r.json();
  }

  const gate = document.getElementById('gate');
  const editor = document.getElementById('editor');
  const gateForm = document.getElementById('gate-form');
  const gateInput = document.getElementById('gate-input');
  const gateErr = document.getElementById('gate-err');

  async function isAuthed() {
    const token = getToken();
    if (!token) return false;
    // Confirm token is still valid by hitting a small protected endpoint
    try {
      const r = await fetch('/api/sessions/list', { headers: { Authorization: `Bearer ${token}` } });
      return r.status !== 401;
    } catch (_) { return false; }
  }

  if (await isAuthed()) {
    showEditor();
  } else {
    gate.style.display = '';
  }

  gateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    gateErr.textContent = '';
    const result = await apiVerify(gateInput.value);
    if (result.ok) {
      sessionStorage.setItem(TOKEN_KEY, result.token);
      gate.style.display = 'none';
      showEditor();
    } else if (result.configError) {
      gateErr.textContent = 'Server passphrase not configured yet. Set the ADMIN_PASSPHRASE env var on Vercel.';
    } else {
      gateErr.textContent = 'Wrong passphrase.';
      gateInput.select();
    }
  });

  document.getElementById('btn-logout-side')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem(TOKEN_KEY);
    location.reload();
  });

  // ---- Sidebar active highlighting ----
  const sideLinks = () => Array.from(document.querySelectorAll('.admin-side a[href^="#"]'));
  function setActive(id) {
    sideLinks().forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  }
  sideLinks().forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActive(id); }
    });
  });

  // ---- Editor ----
  let data = null;

  async function loadInitial() {
    const local = localStorage.getItem(LOCAL_KEY);
    if (local) { try { return JSON.parse(local); } catch (e) { /* fall through */ } }
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
    clearTimeout(persist._t);
    persist._t = setTimeout(() => setStatus('Saved locally'), 1500);
  }

  function field(label, value, onChange, opts = {}) {
    const wrap = document.createElement('div');
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

  function section(id, title, hint) {
    const s = document.createElement('section');
    s.className = 'editor-section';
    s.id = id;
    const h = document.createElement('h3');
    h.textContent = title;
    s.appendChild(h);
    if (hint) {
      const p = document.createElement('p');
      p.className = 'editor-hint';
      p.textContent = hint;
      s.appendChild(p);
    }
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

  function toggleRow(label, desc, checked, onChange) {
    const row = document.createElement('div');
    row.className = 'toggle-row';
    const text = document.createElement('div');
    const l = document.createElement('div');
    l.className = 'toggle-label';
    l.textContent = label;
    text.appendChild(l);
    if (desc) {
      const d = document.createElement('div');
      d.className = 'toggle-desc';
      d.textContent = desc;
      text.appendChild(d);
    }
    row.appendChild(text);
    const sw = document.createElement('div');
    sw.className = 'toggle-switch' + (checked ? ' on' : '');
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(checked));
    sw.tabIndex = 0;
    const flip = () => {
      sw.classList.toggle('on');
      const v = sw.classList.contains('on');
      sw.setAttribute('aria-checked', String(v));
      onChange(v);
    };
    sw.addEventListener('click', flip);
    sw.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    row.appendChild(sw);
    return row;
  }

  function renderForm() {
    const host = document.getElementById('form-host');
    host.innerHTML = '';

    // ---------- Identity ----------
    const idSec = section('sec-identity', 'Identity');
    idSec.appendChild(field('Name', data.name, (v) => (data.name = v)));
    idSec.appendChild(field('Initials (top-left brand)', data.initials, (v) => (data.initials = v)));
    idSec.appendChild(field('Subtitle (above name on home)', data.subtitle, (v) => (data.subtitle = v)));
    idSec.appendChild(field('Hero intro (HTML allowed) — main home paragraph', data.intro, (v) => (data.intro = v), { long: true, rows: 4 }));
    host.appendChild(idSec);

    // ---------- Section toggles ----------
    const togSec = section('sec-sections', 'Sections (show / hide)', 'Each toggle controls whether the corresponding page appears in the top navigation. Pages still work via direct URL even when hidden — useful for previewing.');
    data.sections = data.sections || {};
    const sectionKeys = [
      ['math', 'Math', 'Competition record, research, reading list'],
      ['projects', 'Projects', 'Textbook, SSAMO, mock AMC, card magic'],
      ['recommendations', 'Recommendations', 'Books, videos, etc. with star ratings'],
      ['beyond', 'Beyond math', 'Swimming, piano, skiing, DECA'],
      ['sessions', 'Problem Sessions', 'The "apply to do problems with me" page']
    ];
    sectionKeys.forEach(([key, label, desc]) => {
      if (data.sections[key] === undefined) data.sections[key] = true;
      togSec.appendChild(toggleRow(label, desc, !!data.sections[key], (v) => { data.sections[key] = v; persist(); }));
    });
    host.appendChild(togSec);

    // ---------- Writing / Substack ----------
    const wSec = section('sec-writing', 'Writing link', 'Shows as a button in the top nav. Leave URL blank to hide.');
    data.writing = data.writing || { label: 'Substack', url: '' };
    wSec.appendChild(field('Label', data.writing.label, (v) => (data.writing.label = v), { hint: 'e.g. "Substack", "Blog", "Writing"' }));
    wSec.appendChild(field('URL', data.writing.url, (v) => (data.writing.url = v)));
    host.appendChild(wSec);

    // ---------- Home blurbs ----------
    const homeSec = section('sec-home', 'Home page — two-column blurbs');
    data.homeBlurbs = data.homeBlurbs || [];
    function renderHome() {
      [...homeSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.homeBlurbs.forEach((b, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Label (small caps)', b.label, (v) => { b.label = v; }));
        item.appendChild(field('Body (HTML allowed)', b.body, (v) => { b.body = v; }, { long: true, rows: 3 }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Remove', () => { data.homeBlurbs.splice(i, 1); persist(); renderHome(); }, 'btn danger'));
        item.appendChild(acts);
        homeSec.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add blurb', () => { data.homeBlurbs.push({ label: '', body: '' }); persist(); renderHome(); }, 'btn'));
      homeSec.appendChild(add);
    }
    renderHome();
    host.appendChild(homeSec);

    // ---------- Hero tags ----------
    const tagsSec = section('sec-tags', 'Hero tags (pills under intro)');
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

    // ---------- About ----------
    const aboutSec = section('sec-about', 'About paragraphs');
    data.about = data.about || [];
    function renderAbout() {
      [...aboutSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.about.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field(`Paragraph ${i + 1} (HTML allowed)`, p, (v) => { data.about[i] = v; }, { long: true, rows: 4 }));
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

    // ---------- Competition ----------
    const compSec = section('sec-comp', 'Competition highlights', 'One line per row. HTML allowed (use <strong> for the label).');
    data.competition = data.competition || [];
    function renderComp() {
      [...compSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.competition.forEach((line, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Line', line, (v) => { data.competition[i] = v; }));
        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Move up', () => { if (i > 0) { [data.competition[i - 1], data.competition[i]] = [data.competition[i], data.competition[i - 1]]; persist(); renderComp(); } }));
        acts.appendChild(btn('Move down', () => { if (i < data.competition.length - 1) { [data.competition[i + 1], data.competition[i]] = [data.competition[i], data.competition[i + 1]]; persist(); renderComp(); } }));
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

    // ---------- Research ----------
    const resSec = section('sec-research', 'Research');
    data.research = data.research || { title: '', body: '', note: '' };
    resSec.appendChild(field('Title', data.research.title, (v) => (data.research.title = v)));
    resSec.appendChild(field('Body (HTML allowed)', data.research.body, (v) => (data.research.body = v), { long: true, rows: 5 }));
    resSec.appendChild(field('Italic note', data.research.note, (v) => (data.research.note = v), { long: true, rows: 3 }));
    host.appendChild(resSec);

    // ---------- Reading ----------
    const readSec = section('sec-reading', "What I'm reading");
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

    // ---------- Projects ----------
    const projSec = section('sec-projects', 'Projects');
    data.projects = data.projects || [];
    function renderProj() {
      [...projSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.projects.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Title', p.title, (v) => { p.title = v; }));
        item.appendChild(field('Body (HTML allowed)', p.body, (v) => { p.body = v; }, { long: true, rows: 4 }));
        item.appendChild(field('Link URL', p.link, (v) => { p.link = v; }, { hint: 'Slides, PDF, GitHub, AoPS, etc.' }));
        item.appendChild(field('Link label', p.linkLabel, (v) => { p.linkLabel = v; }, { hint: 'e.g. "View slides →"' }));
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

    // ---------- Recommendations ----------
    const recSec = section('sec-recs', 'Recommendations (with ratings)');
    data.recommendations = data.recommendations || [];
    function renderRec() {
      [...recSec.querySelectorAll('.repeat-item, .add-row')].forEach((n) => n.remove());
      data.recommendations.forEach((r, i) => {
        const item = document.createElement('div');
        item.className = 'repeat-item';
        item.appendChild(field('Title', r.title, (v) => { r.title = v; }));
        item.appendChild(field('Category', r.category, (v) => { r.category = v; }, { hint: 'e.g. Book, Video, Course, Podcast' }));

        const rateWrap = document.createElement('div');
        rateWrap.className = 'field';
        const rl = document.createElement('label');
        rl.textContent = 'Rating';
        rateWrap.appendChild(rl);
        const sel = document.createElement('select');
        sel.style.cssText = 'width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;font-family:var(--font-sans);background:var(--bg)';
        [1, 2, 3, 4, 5].forEach((n) => {
          const opt = document.createElement('option');
          opt.value = n;
          opt.textContent = `${'★'.repeat(n)}${'☆'.repeat(5 - n)}  (${n}/5)`;
          if (Number(r.rating) === n) opt.selected = true;
          sel.appendChild(opt);
        });
        if (!r.rating) sel.value = '5';
        sel.addEventListener('change', () => { r.rating = Number(sel.value); persist(); });
        rateWrap.appendChild(sel);
        item.appendChild(rateWrap);

        item.appendChild(field('Note (HTML allowed)', r.note, (v) => { r.note = v; }, { long: true, rows: 3 }));
        item.appendChild(field('Link (optional)', r.link, (v) => { r.link = v; }, { hint: 'If set, the title becomes a clickable link.' }));

        const acts = document.createElement('div');
        acts.className = 'repeat-actions';
        acts.appendChild(btn('Move up', () => { if (i > 0) { [data.recommendations[i - 1], data.recommendations[i]] = [data.recommendations[i], data.recommendations[i - 1]]; persist(); renderRec(); } }));
        acts.appendChild(btn('Move down', () => { if (i < data.recommendations.length - 1) { [data.recommendations[i + 1], data.recommendations[i]] = [data.recommendations[i], data.recommendations[i + 1]]; persist(); renderRec(); } }));
        acts.appendChild(btn('Remove', () => { data.recommendations.splice(i, 1); persist(); renderRec(); }, 'btn danger'));
        item.appendChild(acts);
        recSec.appendChild(item);
      });
      const add = document.createElement('div');
      add.className = 'add-row';
      add.appendChild(btn('+ Add recommendation', () => { data.recommendations.push({ title: '', category: 'Book', rating: 5, note: '', link: '' }); persist(); renderRec(); }, 'btn'));
      recSec.appendChild(add);
    }
    renderRec();
    host.appendChild(recSec);

    // ---------- Activities ----------
    const actSec = section('sec-act', 'Beyond math');
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

    // ---------- Sessions page copy ----------
    const sesSec = section('sec-sessions', 'Sessions page', 'All copy on the /sessions page.');
    data.sessions = data.sessions || { title: '', subtitle: '', rules: [], levels: [], windows: [], successHeading: '', successBody: '' };
    sesSec.appendChild(field('Title', data.sessions.title, (v) => (data.sessions.title = v)));
    sesSec.appendChild(field('Subtitle (HTML allowed)', data.sessions.subtitle, (v) => (data.sessions.subtitle = v), { long: true, rows: 4 }));

    function repeatable(label, key, addLabel) {
      const wrap = document.createElement('div');
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:block;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:14px 0 6px';
      lbl.textContent = label;
      wrap.appendChild(lbl);
      const list = document.createElement('div');
      function r() {
        list.innerHTML = '';
        (data.sessions[key] || []).forEach((line, i) => {
          const item = document.createElement('div');
          item.className = 'repeat-item';
          item.appendChild(field('Line', line, (v) => { data.sessions[key][i] = v; }));
          const acts = document.createElement('div');
          acts.className = 'repeat-actions';
          acts.appendChild(btn('Remove', () => { data.sessions[key].splice(i, 1); persist(); r(); }, 'btn danger'));
          item.appendChild(acts);
          list.appendChild(item);
        });
        const add = document.createElement('div');
        add.className = 'add-row';
        add.appendChild(btn(addLabel, () => { data.sessions[key] = data.sessions[key] || []; data.sessions[key].push(''); persist(); r(); }, 'btn'));
        list.appendChild(add);
      }
      r();
      wrap.appendChild(list);
      return wrap;
    }
    sesSec.appendChild(repeatable('House rules', 'rules', '+ Add rule'));
    sesSec.appendChild(repeatable('Level options', 'levels', '+ Add level'));
    sesSec.appendChild(repeatable('Time windows', 'windows', '+ Add window'));
    sesSec.appendChild(field('Success heading (after submit)', data.sessions.successHeading, (v) => (data.sessions.successHeading = v)));
    sesSec.appendChild(field('Success body', data.sessions.successBody, (v) => (data.sessions.successBody = v), { long: true, rows: 3 }));
    host.appendChild(sesSec);

    // ---------- Applicants viewer ----------
    const appSec = section('sec-applicants', 'Sessions applicants', 'Applications submitted through the public Sessions form, stored server-side.');
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    async function renderApps() {
      [...appSec.querySelectorAll('.applicant-row, .add-row, .applicants-msg')].forEach((n) => n.remove());

      const msg = document.createElement('p');
      msg.className = 'applicants-msg';
      msg.style.cssText = 'color:var(--muted);font-size:14px;margin:8px 0 14px';
      msg.textContent = 'Loading…';
      appSec.appendChild(msg);

      let items = [];
      let serverWorks = false;
      try {
        const r = await apiListApps();
        items = r.items || [];
        serverWorks = true;
        msg.textContent = items.length ? `${items.length} application${items.length === 1 ? '' : 's'}.` : 'No applications yet.';
      } catch (err) {
        msg.textContent = 'Server unavailable: ' + err.message + '. Showing any local fallback entries.';
        try { items = JSON.parse(localStorage.getItem(APPS_LOCAL_KEY) || '[]').slice().reverse(); } catch (_) {}
      }

      items.forEach((a) => {
        const row = document.createElement('div');
        row.className = 'applicant-row';
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = `${a.at ? new Date(a.at).toLocaleString() : '?'} · ${a.email || '(no email)'}`;
        row.appendChild(meta);
        const info = document.createElement('div');
        info.style.marginTop = '4px';
        info.innerHTML = `<strong>${escapeHtml(a.level || '')}</strong>${a.when ? ' · ' + escapeHtml(a.when) : ''}`;
        row.appendChild(info);
        if (a.topic) {
          const t = document.createElement('div');
          t.className = 'topic';
          t.textContent = a.topic;
          row.appendChild(t);
        }
        appSec.appendChild(row);
      });

      const acts = document.createElement('div');
      acts.className = 'add-row';
      acts.appendChild(btn('Refresh', renderApps, 'btn secondary'));
      if (serverWorks) {
        acts.appendChild(btn('Clear all (server)', async () => {
          if (!confirm('Delete ALL applications from the server? This cannot be undone.')) return;
          try { await apiClearApps(); await renderApps(); }
          catch (err) { alert('Clear failed: ' + err.message); }
        }, 'btn danger'));
      }
      if (localStorage.getItem(APPS_LOCAL_KEY)) {
        acts.appendChild(btn('Clear local fallback', () => {
          localStorage.removeItem(APPS_LOCAL_KEY);
          renderApps();
        }, 'btn danger'));
      }
      appSec.appendChild(acts);
    }
    renderApps();
    host.appendChild(appSec);

    // ---------- Contact ----------
    const cSec = section('sec-contact', 'Contact');
    data.contact = data.contact || { blurb: '', email: '', links: [] };
    cSec.appendChild(field('Blurb', data.contact.blurb, (v) => (data.contact.blurb = v)));
    cSec.appendChild(field('Email', data.contact.email, (v) => (data.contact.email = v), { hint: 'Also used as the destination for Sessions applications.' }));
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

    // ---------- Passphrase ----------
    const pSec = section('sec-pw', 'Passphrase', 'The admin passphrase is the ADMIN_PASSPHRASE environment variable on Vercel. To change it, run on the command line:');
    const code = document.createElement('pre');
    code.style.cssText = 'background:var(--bg-alt);border:1px solid var(--line);border-radius:8px;padding:14px;font-family:var(--font-mono);font-size:13px;overflow-x:auto;margin:0 0 12px';
    code.textContent = 'vercel env rm ADMIN_PASSPHRASE production\nvercel env add ADMIN_PASSPHRASE production\n# (paste new passphrase, then redeploy)\nvercel deploy --prod';
    pSec.appendChild(code);
    const note = document.createElement('p');
    note.style.cssText = 'color:var(--muted);font-size:13px;margin:0';
    note.textContent = 'Or use the Vercel dashboard → Settings → Environment Variables.';
    pSec.appendChild(note);
    host.appendChild(pSec);

    // Scroll-spy
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, { rootMargin: '-40% 0% -55% 0%' });
    host.querySelectorAll('.editor-section').forEach((s) => obs.observe(s));
  }

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
})();

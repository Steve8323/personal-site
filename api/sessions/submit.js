import { appendApplication } from '../_lib/auth.js';

const MAX_FIELD = 2000;
function clean(s, n = MAX_FIELD) { return String(s == null ? '' : s).slice(0, n); }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const body = req.body || {};
  const email = clean(body.email, 200).trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'valid email required' });
  }

  // Honeypot: if any "_hp" field is set, silently 200 (bot)
  if (body._hp) return res.status(200).json({ ok: true });

  const record = {
    at: new Date().toISOString(),
    email,
    level: clean(body.level, 200),
    when: clean(body.when, 200),
    topic: clean(body.topic, MAX_FIELD),
    ip: clean(req.headers['x-forwarded-for'], 100).split(',')[0].trim(),
    ua: clean(req.headers['user-agent'], 300)
  };

  try {
    const count = await appendApplication(record);
    return res.status(200).json({ ok: true, count });
  } catch (err) {
    console.error('submit error', err);
    return res.status(500).json({ error: 'storage write failed', detail: String(err).slice(0, 200) });
  }
}

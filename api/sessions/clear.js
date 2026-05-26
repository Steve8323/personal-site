import { verifyAuth, clearApplications } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!verifyAuth(req)) return res.status(401).json({ error: 'unauthorized' });

  try {
    await clearApplications();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('clear error', err);
    return res.status(500).json({ error: 'storage delete failed', detail: String(err).slice(0, 200) });
  }
}

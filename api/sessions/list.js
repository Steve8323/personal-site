import { verifyAuth, loadApplications } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!verifyAuth(req)) return res.status(401).json({ error: 'unauthorized' });

  try {
    const items = await loadApplications();
    return res.status(200).json({ items, count: items.length });
  } catch (err) {
    console.error('list error', err);
    return res.status(500).json({ error: 'storage read failed', detail: String(err).slice(0, 200) });
  }
}

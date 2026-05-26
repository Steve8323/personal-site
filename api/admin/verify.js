import crypto from 'node:crypto';
import { expectedTokenHex } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const body = req.body || {};
  const submitted = typeof body.passphrase === 'string' ? body.passphrase : '';
  if (!submitted) return res.status(400).json({ error: 'passphrase required' });

  const expected = expectedTokenHex();
  if (!expected) return res.status(500).json({ error: 'server not configured: ADMIN_PASSPHRASE missing' });

  const submittedHash = crypto.createHash('sha256').update(submitted).digest();
  const expectedBuf = Buffer.from(expected, 'hex');
  let ok = false;
  try { ok = crypto.timingSafeEqual(submittedHash, expectedBuf); } catch (_) {}
  if (!ok) return res.status(401).json({ error: 'wrong passphrase' });

  return res.status(200).json({ ok: true, token: expected });
}

import crypto from 'node:crypto';
import { put, head } from '@vercel/blob';

function blobPath() {
  const key = process.env.BLOB_APP_KEY || 'default';
  return `sessions/${key}/applications.json`;
}

export function sha256Hex(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}

export function expectedTokenHex() {
  const pw = process.env.ADMIN_PASSPHRASE || '';
  if (!pw) return null;
  return sha256Hex(pw);
}

export function verifyAuth(req) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const token = String(auth).replace(/^Bearer\s+/i, '').trim();
  const expected = expectedTokenHex();
  if (!token || !expected || token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch (_) {
    return false;
  }
}

async function readBlobJson() {
  try {
    const meta = await head(blobPath());
    if (!meta || !meta.url) return [];
    const r = await fetch(meta.url, { cache: 'no-store' });
    if (!r.ok) return [];
    const text = await r.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && err.name === 'BlobNotFoundError') return [];
    if (String(err).includes('404')) return [];
    throw err;
  }
}

async function writeBlobJson(items) {
  await put(blobPath(), JSON.stringify(items, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true
  });
}

export async function loadApplications() {
  return readBlobJson();
}

export async function appendApplication(record, maxKeep = 1000) {
  const items = await readBlobJson();
  items.unshift(record);
  if (items.length > maxKeep) items.length = maxKeep;
  await writeBlobJson(items);
  return items.length;
}

export async function clearApplications() {
  await writeBlobJson([]);
}

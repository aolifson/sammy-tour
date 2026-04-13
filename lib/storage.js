import { put, list } from '@vercel/blob';

const STATE_PATHNAME = 'state.json';
const PHOTO_PREFIX = 'photos/';

function hasToken() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function getState() {
  if (!hasToken()) return {};
  try {
    const { blobs } = await list({ prefix: STATE_PATHNAME });
    if (blobs.length === 0) return {};
    const latest = blobs.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];
    const res = await fetch(latest.url, { cache: 'no-store' });
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    console.error('getState failed:', e);
    return {};
  }
}

export async function saveState(state) {
  if (!hasToken()) throw new Error('Blob storage not configured');
  await put(STATE_PATHNAME, JSON.stringify(state), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

export async function uploadPhoto(id, buffer, contentType) {
  if (!hasToken()) throw new Error('Blob storage not configured');
  const ext = (contentType && contentType.split('/')[1]) || 'jpg';
  const safeExt = ext.replace(/[^a-z0-9]/gi, '');
  const path = `${PHOTO_PREFIX}${id}-${Date.now()}.${safeExt}`;
  const result = await put(path, buffer, {
    access: 'public',
    contentType: contentType || 'image/jpeg',
  });
  return result.url;
}

export function isConfigured() {
  return hasToken();
}

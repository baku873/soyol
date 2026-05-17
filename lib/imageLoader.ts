/**
 * Simple image loader for Next.js.
 *
 * Returns Cloudinary URLs as-is (no transformation params) to avoid 401 errors
 * when Cloudinary transformation credits are exhausted on the free tier.
 * The original uploaded image will be served directly from Cloudinary CDN.
 */

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src }: ImageLoaderParams): string {
  // Return Cloudinary URLs as-is — no transformation params to avoid 401 errors
  // when monthly transformation credits are used up
  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    // Strip any existing transformation segments so we get the raw original image
    const uploadMarker = '/upload/';
    const idx = src.indexOf(uploadMarker);
    const base = src.slice(0, idx + uploadMarker.length);
    const rest = src.slice(idx + uploadMarker.length);

    // Remove transform segments (e.g. w_500,q_auto,f_auto/v123/...) → keep from v123/... or public_id
    const parts = rest.split('/');
    const cleanParts: string[] = [];
    let passedTransforms = false;

    for (const part of parts) {
      if (!passedTransforms && /^[a-z]{1,3}_/.test(part)) {
        continue; // skip transform segments
      }
      passedTransforms = true;
      cleanParts.push(part);
    }

    return `${base}${cleanParts.join('/')}`;
  }

  // Local / other images — return as-is
  return src;
}


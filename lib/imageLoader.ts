/**
 * Ultra-optimized custom image loader for Next.js.
 *
 * Delegates Cloudinary image optimization to Cloudinary's own CDN edge network
 * instead of routing through Next.js's /_next/image proxy (which times out at 7s
 * on large remote images).
 *
 * Features:
 * - Strips existing Cloudinary transforms to avoid duplication (q_auto/f_auto etc.)
 * - Injects optimal width, quality, format, and DPR transforms
 * - Falls through cleanly for local and non-Cloudinary images
 */

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

// Regex to strip existing Cloudinary per-component transforms that we'll replace
// Matches chains like "q_auto/f_auto/", "w_500,c_fill/", etc. before the version or public ID
const CLOUDINARY_TRANSFORM_RE =
  /\/upload\/(?:(?:[a-z]_[^/]+\/)*)/;

export default function imageLoader({ src, width, quality }: ImageLoaderParams): string {
  // ── Cloudinary URLs ──────────────────────────────────────────────
  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    const q = quality || 'auto';

    // Split at "/upload/" to isolate the base and the rest (transforms + id)
    const uploadMarker = '/upload/';
    const idx = src.indexOf(uploadMarker);
    const base = src.slice(0, idx + uploadMarker.length);  // https://res.cloudinary.com/<cloud>/image/upload/
    let rest = src.slice(idx + uploadMarker.length);        // existing_transforms/v123/public_id.ext

    // Strip any existing transformation segments before the version (v123…) or public ID
    // Cloudinary transforms are slash-separated segments that contain underscores (e.g. q_auto, f_auto, w_500)
    // We strip them all and replace with our optimized set
    const parts = rest.split('/');
    const cleanParts: string[] = [];
    let passedTransforms = false;

    for (const part of parts) {
      if (!passedTransforms && /^[a-z]{1,3}_/.test(part)) {
        // This is a transform segment like q_auto, f_auto, w_500, c_limit — skip it
        continue;
      }
      passedTransforms = true;
      cleanParts.push(part);
    }

    rest = cleanParts.join('/');

    // Build our optimized transform chain:
    // w_  : resize to requested width
    // q_  : quality (auto or specific number)
    // f_auto : auto-negotiate best format (webp/avif) based on browser Accept header
    // c_limit : scale down only, never upscale, preserve aspect ratio
    // dpr_auto : serve retina-appropriate density
    const transforms = `w_${width},q_${q},f_auto,c_limit,dpr_auto`;

    return `${base}${transforms}/${rest}`;
  }

  // ── Local / other images ─────────────────────────────────────────
  // With loader:'custom', /_next/image is disabled.
  // Return src as-is — the browser fetches directly.
  return src;
}

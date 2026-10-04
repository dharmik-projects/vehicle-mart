/**
 * Cloudinary URL helpers.
 *
 * Product uploads are stored on Cloudinary as original files. Card/thumbnail
 * usage should never download the original — these helpers rewrite the URL to
 * request a sized, auto-compressed derivative instead (on-the-fly transform,
 * no extra dependencies, no upload changes).
 *
 * Non-Cloudinary URLs are returned untouched.
 */

/** Insert a Cloudinary transformation after `/upload/` (once). */
function withTransform(url: string, transform: string): string {
  if (!url || !url.includes("/upload/")) return url;
  const [, rest] = url.split("/upload/");
  // Untransformed uploads start with a version segment ("v123456/...").
  // Anything else already carries a transformation — don't double-apply.
  if (!/^v\d+\//.test(rest)) return url;
  return url.replace("/upload/", `/upload/${transform}/`);
}

/** Square thumbnail for cards / lists / suggestions. */
export function thumbUrl(url: string | undefined, size = 400): string {
  if (!url) return "";
  return withTransform(url, `w_${size},h_${size},c_fill,q_auto,f_auto,dpr_auto`);
}

/** Larger detail-view image (bounded, never the original). */
export function detailUrl(url: string | undefined, size = 1000): string {
  if (!url) return "";
  return withTransform(url, `w_${size},c_limit,q_auto,f_auto,dpr_auto`);
}

/** Small square (cart rows, order lines). */
export function miniUrl(url: string | undefined, size = 160): string {
  if (!url) return "";
  return withTransform(url, `w_${size},h_${size},c_fill,q_auto,f_auto,dpr_auto`);
}

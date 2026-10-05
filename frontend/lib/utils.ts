import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    returned: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.substring(0, len) + '...' : str;
}

export function generateStars(rating: number): string[] {
  const stars: string[] = [];
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  for (let i = 0; i < full; i++) stars.push('full');
  if (half) stars.push('half');
  while (stars.length < 5) stars.push('empty');
  return stars;
}

/**
 * Category icons are emoji stored in MongoDB. Older records may hold broken
 * placeholder text ("?", "??", "???") from a lossy write — only surface the
 * value when it actually contains a pictographic character so callers can
 * fall back to their default glyph instead of rendering garbage.
 */
export function emojiIcon(value?: string | null): string {
  const s = (value || '').trim();
  if (!s) return '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    // Astral plane (surrogate pair) — most pictographic emoji live there.
    if (c >= 0xd800 && c <= 0xdfff) return s;
    // BMP symbol blocks: arrows, geometric/symbol shapes, misc symbols
    // (⚙ U+2699, ⛽ U+26FD, ❄ U+2744, ⇥ …) — never ASCII "?" placeholders.
    if (c >= 0x2190 && c <= 0x2bff) return s;
  }
  return '';
}

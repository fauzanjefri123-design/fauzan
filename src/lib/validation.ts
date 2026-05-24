/**
 * Input validation utilities for forms
 */

export function validateProductName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Nama produk wajib diisi';
  }
  if (name.length > 50) {
    return 'Nama produk maksimal 50 karakter';
  }
  return null;
}

export function validatePrice(price: string | number): string | null {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num) || num <= 0) {
    return 'Harga wajib berupa angka positif lebih dari Rp0';
  }
  return null;
}

export function validateStock(stock: string | number): string | null {
  const num = typeof stock === 'string' ? parseInt(stock, 10) : stock;
  if (isNaN(num) || num < 0) {
    return 'Stok tidak boleh negatif';
  }
  return null;
}

export function validateEmail(email: string, required = false): string | null {
  if (!email || email.trim().length === 0) {
    return required ? 'Email wajib diisi' : null;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Format email tidak valid (contoh: nama@domain.com)';
  }
  return null;
}

export function validatePhone(phone: string, required = false): string | null {
  if (!phone || phone.trim().length === 0) {
    return required ? 'Nomor telepon wajib diisi' : null;
  }
  const digitsOnly = phone.replace(/[^0-9+]/g, '');
  if (digitsOnly.length < 9 || digitsOnly.length > 15) {
    return 'Nomor telepon wajib terdiri dari 9 s.d. 15 digit angka';
  }
  return null;
}

export function sanitizeInput(val: string): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// SECURE OFFLINE SESSION VERIFICATION USING HMAC-LIKE DETERMINISTIC SIGNATURES
const SIGNATURE_SECRET_KEY = "ZeroTrustFortressHardenedKey_2026_InMarket";

export function computeOfflineSessionSignature(uid: string, email: string, role: string, expiresAt: number): string {
  const payload = `${uid}||${email}||${role}||${expiresAt}||${SIGNATURE_SECRET_KEY}`;
  let hashVal = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hashVal ^= payload.charCodeAt(i);
    hashVal += (hashVal << 1) + (hashVal << 4) + (hashVal << 7) + (hashVal << 8) + (hashVal << 24);
  }
  return (hashVal >>> 0).toString(16);
}

export function verifyOfflineSessionSignature(u: any): boolean {
  if (!u || !u.uid || !u.expiresAt || !u.signature) return false;
  const now = new Date().getTime();
  if (now > u.expiresAt) return false;
  const recomputed = computeOfflineSessionSignature(u.uid, u.email || '', u.role || '', u.expiresAt);
  return recomputed === u.signature;
}

export function createSignedOfflineSession(u: any): any {
  const expiresAt = u.expiresAt || (new Date().getTime() + 24 * 60 * 60 * 1000);
  const signature = computeOfflineSessionSignature(u.uid, u.email || '', u.role || 'Owner', expiresAt);
  return {
    ...u,
    expiresAt,
    signature
  };
}

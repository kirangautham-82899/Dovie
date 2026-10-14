// Journal encryption, implementing docs/crypto-spec.md (v1).
// No imports on purpose: scripts/crypto-test.mjs loads this file directly in
// Node to check it against the spec's test vectors.

export const VERSION = 1;
export const KDF_ITERATIONS = 600_000;
export const MIN_PASSPHRASE_LENGTH = 10;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/^\\x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Copies into a fresh ArrayBuffer-backed array, which Web Crypto's types require. */
function buf(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function aesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", buf(raw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** PBKDF2-HMAC-SHA256 over the NFKC-normalised passphrase. Returns the 32-byte KEK. */
export async function deriveKek(passphrase: string, salt: Uint8Array, iterations = KDF_ITERATIONS): Promise<Uint8Array> {
  const base = await crypto.subtle.importKey("raw", buf(enc.encode(passphrase.normalize("NFKC"))), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: buf(salt), iterations }, base, 256);
  return new Uint8Array(bits);
}

/** version || IV || AES-GCM(ciphertext || tag), base64url. `iv` is for tests only. */
export async function seal(keyRaw: Uint8Array, plaintext: Uint8Array, aad: string, iv: Uint8Array = randomBytes(12)) {
  const key = await aesKey(keyRaw);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: buf(iv), additionalData: buf(enc.encode(aad)) }, key, buf(plaintext)),
  );
  const out = new Uint8Array(1 + iv.length + ct.length);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(ct, 1 + iv.length);
  return toBase64Url(out);
}

/** Throws on an unknown version or a failed tag (wrong key, wrong AAD or tampering). */
export async function open(keyRaw: Uint8Array, blob: string, aad: string): Promise<Uint8Array> {
  const bytes = fromBase64Url(blob);
  if (bytes[0] !== VERSION) throw new Error(`Unknown blob version ${bytes[0]}`);
  const key = await aesKey(keyRaw);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(1, 13), additionalData: buf(enc.encode(aad)) },
    key,
    bytes.slice(13),
  );
  return new Uint8Array(pt);
}

export const aad = {
  dek: (userId: string) => `dovie:v1:dek:${userId}`,
  dekRecovery: (userId: string) => `dovie:v1:dek-recovery:${userId}`,
  entry: (userId: string, entryId: string) => `dovie:v1:entry:${userId}:${entryId}`,
};

/** What is stored in journal_keys (salt as raw bytes). */
export type KeyMaterial = {
  salt: Uint8Array;
  iterations: number;
  wrappedDek: string;
  wrappedDekRecovery: string;
};

// The recovery key is shown as RFC 4648 base32 (A-Z, 2-7) in dash-separated
// groups of 4: easy to write down, no characters that clash with the dashes,
// and case-insensitive when typed back in.
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function formatRecoveryKey(raw: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of raw) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out.match(/.{1,4}/g)!.join("-");
}

export function parseRecoveryKey(text: string): Uint8Array {
  const clean = text.toUpperCase().replace(/[\s-]/g, "");
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const v = BASE32.indexOf(ch);
    if (v < 0) throw new Error("That recovery key has a character that doesn't belong in it.");
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  if (out.length !== 32) throw new Error("That recovery key is not the right length.");
  return new Uint8Array(out);
}

/** First-time setup: a new DEK wrapped by the passphrase and by a new recovery key. */
export async function setupKeys(passphrase: string, userId: string) {
  const dek = randomBytes(32);
  const recovery = randomBytes(32);
  const salt = randomBytes(16);
  const kek = await deriveKek(passphrase, salt);
  const material: KeyMaterial = {
    salt,
    iterations: KDF_ITERATIONS,
    wrappedDek: await seal(kek, dek, aad.dek(userId)),
    wrappedDekRecovery: await seal(recovery, dek, aad.dekRecovery(userId)),
  };
  return { dek, material, recoveryKey: formatRecoveryKey(recovery) };
}

/** Unwraps the DEK with the passphrase. A wrong passphrase throws. */
export async function unlockWithPassphrase(passphrase: string, m: KeyMaterial, userId: string) {
  const kek = await deriveKek(passphrase, m.salt, m.iterations);
  return open(kek, m.wrappedDek, aad.dek(userId));
}

export async function unlockWithRecoveryKey(recoveryKey: string, m: KeyMaterial, userId: string) {
  return open(parseRecoveryKey(recoveryKey), m.wrappedDekRecovery, aad.dekRecovery(userId));
}

/** Re-wraps an unlocked DEK under a new passphrase and salt. Entries are untouched. */
export async function rewrapDek(dek: Uint8Array, newPassphrase: string, userId: string) {
  const salt = randomBytes(16);
  const kek = await deriveKek(newPassphrase, salt);
  return { salt, iterations: KDF_ITERATIONS, wrappedDek: await seal(kek, dek, aad.dek(userId)) };
}

export type EntryContent = { body: string; gratitude: string };

export async function encryptEntry(dek: Uint8Array, userId: string, entryId: string, content: EntryContent) {
  return seal(dek, enc.encode(JSON.stringify(content)), aad.entry(userId, entryId));
}

export async function decryptEntry(dek: Uint8Array, userId: string, entryId: string, blob: string): Promise<EntryContent> {
  const parsed = JSON.parse(dec.decode(await open(dek, blob, aad.entry(userId, entryId))));
  return { body: String(parsed.body ?? ""), gratitude: String(parsed.gratitude ?? "") };
}

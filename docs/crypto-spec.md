# Dovie Journal Encryption Spec (v1)

Web (Web Crypto) and Flutter (`cryptography` package) must produce and read
**byte-identical** formats. Any change to this document is a new version, never an edit.

## Goals
- Journal text is unreadable in the database and to Dovie staff.
- The same entries open on web and mobile.
- The user can change their passphrase without re-encrypting every entry.
- Losing the passphrase is recoverable only through the recovery key. Without both, data is gone by design.

## Non-goals
- Protecting a device that is already compromised.
- Server-side search or AI over journal text (search is client-side; AI is opt-in per request, see PLAN.md).

## Key hierarchy

```
passphrase ──PBKDF2──> KEK ──AES-GCM wraps──> DEK ──AES-GCM encrypts──> journal entries
recovery key ───────────────AES-GCM wraps────> DEK   (second copy)
```

| Key | Size | Origin | Stored |
|---|---|---|---|
| DEK (data encryption key) | 32 bytes | Random, generated once on the client | Only wrapped, in `journal_keys` |
| KEK (key encryption key) | 32 bytes | Derived from the passphrase | Never stored |
| Recovery key | 32 bytes | Random, shown to the user once | Never stored in plain; user keeps it |

The passphrase protects the DEK. A short PIN is **not** used as the root secret: a database
leak would allow offline guessing of a 4-6 digit PIN in minutes. A PIN or biometrics may only
unlock a DEK cached in the device's secure storage (Keychain/Keystore, or WebAuthn later).
The passphrase must be at least 10 characters.

## Algorithms

| Purpose | Algorithm | Parameters |
|---|---|---|
| Passphrase to KEK | PBKDF2-HMAC-SHA256 | 600,000 iterations, 16-byte random salt, 32-byte output |
| Encrypt / wrap | AES-256-GCM | 12-byte random IV, 128-bit tag, with AAD |
| Randomness | `crypto.getRandomValues` (web), `Random.secure()` / `cryptography` (Flutter) | |

The passphrase is normalised with Unicode **NFKC** and encoded as UTF-8 before PBKDF2.
Argon2id would be stronger but is not in Web Crypto; revisit in v2.

## Blob format

Every encrypted value is stored as base64url (no padding) of:

```
byte 0        version (0x01)
bytes 1-12    IV (12 bytes, random per encryption, never reused with the same key)
bytes 13-end  AES-GCM output = ciphertext || 16-byte tag
```

## Associated data (AAD)

AAD binds ciphertext to its row so blobs cannot be swapped between users or entries.
UTF-8 strings, exactly:

| Value | AAD |
|---|---|
| Wrapped DEK | `dovie:v1:dek:<user_id>` |
| Wrapped DEK (recovery copy) | `dovie:v1:dek-recovery:<user_id>` |
| Journal entry | `dovie:v1:entry:<user_id>:<entry_id>` |

UUIDs are lowercase, hyphenated.

## Storage (added with the journal migration)

`journal_keys(user_id pk, kdf_salt bytea, kdf_iterations int, wrapped_dek text, wrapped_dek_recovery text, version smallint)`

`journal_entries(id, user_id, entry_date, ciphertext text, created_at, updated_at, deleted_at)`

Mood, date and word count are **not** secret and may be stored in plain columns if wanted for
insights. The body text, prompt answer and gratitude line are encrypted together as one JSON
document: `{"body": "...", "gratitude": "..."}`.

## Flows

**Setup:** generate DEK, salt and recovery key. Derive KEK from the passphrase, wrap the DEK
with it, and wrap a second copy with the recovery key. Store both wrapped copies and the salt.
Show the recovery key once and make the user confirm they saved it.

**Unlock:** fetch `journal_keys`, derive KEK, unwrap DEK. A GCM tag failure means a wrong
passphrase. Keep the DEK in memory only, or in secure storage if the user enabled PIN/biometric unlock.

**Change passphrase:** unlock, derive a new KEK with a new salt, re-wrap the DEK. Entries are untouched.

**Recover:** unwrap the DEK with the recovery key, then set a new passphrase as above.

**Delete account:** delete `journal_keys` and `journal_entries` rows (the cascade handles this).

## Test vectors (both platforms must reproduce these exactly)

Generated with Node 24 Web Crypto. User id `11111111-1111-1111-1111-111111111111`,
entry id `22222222-2222-2222-2222-222222222222`.

**1. KEK derivation**
- passphrase: `correct horse battery staple`
- salt (hex): `000102030405060708090a0b0c0d0e0f`
- iterations: `600000`
- KEK (hex): `ef177144eec9420cbc1093d2a8b344a92bc506d0d4ec9c028dd19f8324d8c1e6`

**2. DEK wrapping**
- DEK (hex): `a0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebf`
- IV (hex): `101112131415161718191a1b`
- AAD: `dovie:v1:dek:11111111-1111-1111-1111-111111111111`
- blob:
  `ARAREhMUFRYXGBkaG6yz32a0Wg7QYxMzY2Be2lWhiShXMtJgHHuJoVF0BP5QSkraI_dwmBoRbrnZIrW1Og`

**3. Entry encryption** (using the DEK above)
- IV (hex): `202122232425262728292a2b`
- AAD: `dovie:v1:entry:11111111-1111-1111-1111-111111111111:22222222-2222-2222-2222-222222222222`
- plaintext: `One win today: I finished my first week of Dovie.`
- blob:
  `ASAhIiMkJSYnKCkqK1O0saG2H_T63_nk9kv468RdnrSzqn1Nk10ZoeAxQmTWLS4oy2q76a5Ig75gQWuGQev9Jb-o7Netv1skM4rHBoJr`

Each implementation needs tests that (a) reproduce these exact outputs from the fixed inputs and
(b) decrypt these blobs back to the DEK and plaintext. Fixed IVs are for tests only; production
always uses a fresh random IV.

## Rules for implementers
- Never log keys, passphrases or plaintext. Never send them to Sentry/PostHog.
- Never reuse an IV with the same key. Always generate a fresh one.
- Reject blobs with an unknown version byte; do not guess.
- Keep this spec and both implementations' tests in sync in the same PR.

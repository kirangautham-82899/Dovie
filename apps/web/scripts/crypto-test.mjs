// Checks the journal crypto against the test vectors in docs/crypto-spec.md.
// Run from apps/web:  npm run test:crypto   (no Supabase needed)
import * as c from "../src/features/journal/crypto.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};

const userId = "11111111-1111-1111-1111-111111111111";
const entryId = "22222222-2222-2222-2222-222222222222";

// 1. KEK derivation
const kek = await c.deriveKek("correct horse battery staple", c.fromHex("000102030405060708090a0b0c0d0e0f"), 600000);
const expectedKek = "ef177144eec9420cbc1093d2a8b344a92bc506d0d4ec9c028dd19f8324d8c1e6";
check("KEK matches vector 1", c.toHex(kek) === expectedKek, c.toHex(kek));

// 2. DEK wrapping
const dek = c.fromHex("a0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebf");
const wrapBlob = "ARAREhMUFRYXGBkaG6yz32a0Wg7QYxMzY2Be2lWhiShXMtJgHHuJoVF0BP5QSkraI_dwmBoRbrnZIrW1Og";
const wrapped = await c.seal(kek, dek, c.aad.dek(userId), c.fromHex("101112131415161718191a1b"));
check("wrapped DEK matches vector 2", wrapped === wrapBlob, wrapped);
const unwrapped = await c.open(kek, wrapBlob, c.aad.dek(userId));
check("vector 2 unwraps to the DEK", c.toHex(unwrapped) === c.toHex(dek));

// 3. Entry encryption
const plaintext = "One win today: I finished my first week of Dovie.";
const entryBlob =
  "ASAhIiMkJSYnKCkqK1O0saG2H_T63_nk9kv468RdnrSzqn1Nk10ZoeAxQmTWLS4oy2q76a5Ig75gQWuGQev9Jb-o7Netv1skM4rHBoJr";
const sealed = await c.seal(
  dek,
  new TextEncoder().encode(plaintext),
  c.aad.entry(userId, entryId),
  c.fromHex("202122232425262728292a2b"),
);
check("entry blob matches vector 3", sealed === entryBlob, sealed);
const opened = new TextDecoder().decode(await c.open(dek, entryBlob, c.aad.entry(userId, entryId)));
check("vector 3 decrypts to the plaintext", opened === plaintext, opened);

// Negative cases
const rejects = async (fn) => fn().then(() => false, () => true);
check("wrong AAD is rejected", await rejects(() => c.open(dek, entryBlob, c.aad.entry(userId, userId))));
const bumped = c.fromBase64Url(entryBlob);
bumped[0] = 2;
check("unknown version is rejected", await rejects(() => c.open(dek, c.toBase64Url(bumped), c.aad.entry(userId, entryId))));

// Recovery key formatting must round-trip for every key, whatever its bytes.
let roundTrips = true;
for (let i = 0; i < 500 && roundTrips; i++) {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const shown = c.formatRecoveryKey(raw);
  roundTrips =
    c.toHex(c.parseRecoveryKey(shown)) === c.toHex(raw) &&
    c.toHex(c.parseRecoveryKey(` ${shown.toLowerCase().replace(/-/g, " ")} `)) === c.toHex(raw);
}
check("recovery key format round-trips (500 random keys, any case/spacing)", roundTrips);

// Full flow: setup, unlock, recovery, passphrase change, entry round trip
const { dek: newDek, material, recoveryKey } = await c.setupKeys("a long passphrase", userId);
const viaPass = await c.unlockWithPassphrase("a long passphrase", material, userId);
check("setup then unlock with passphrase", c.toHex(viaPass) === c.toHex(newDek));
check("wrong passphrase is rejected", await rejects(() => c.unlockWithPassphrase("not it at all", material, userId)));
const viaRecovery = await c.unlockWithRecoveryKey(recoveryKey, material, userId);
check("unlock with recovery key", c.toHex(viaRecovery) === c.toHex(newDek));
const rewrapped = await c.rewrapDek(newDek, "a brand new passphrase", userId);
const afterChange = await c.unlockWithPassphrase("a brand new passphrase", { ...material, ...rewrapped }, userId);
check("passphrase change keeps the same DEK", c.toHex(afterChange) === c.toHex(newDek));
const blob = await c.encryptEntry(newDek, userId, entryId, { body: "hello", gratitude: "tea" });
const back = await c.decryptEntry(newDek, userId, entryId, blob);
check("entry round trip", back.body === "hello" && back.gratitude === "tea");

console.log(failed ? `\n${failed} check(s) failed` : "\nAll crypto checks passed");
process.exit(failed ? 1 : 0);

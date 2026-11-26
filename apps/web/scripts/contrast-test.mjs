// Checks that the pastel palette stays readable: every text colour against the
// surfaces it sits on, for each page accent in light and dark, at WCAG AA for
// normal text (4.5:1). Reads the real tokens from globals.css.
// Run from apps/web:  npm run test:contrast
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const block = (selector) => {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`globals.css has no "${selector}" block`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};

const accents = ["rose", "mint", "lilac", "sky", "butter", "peach", "coral"];
const accentBlock = (name) => {
  const m = new RegExp(`\\[data-accent="${name}"\\] \\{([^}]*)\\}`).exec(css);
  if (!m) throw new Error(`no accent ${name}`);
  return Object.fromEntries([...m[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
};
const light = block(":root, [data-accent]");
const dark = block(".dark, .dark [data-accent]");

function resolve(value, vars) {
  let v = value;
  while (v.includes("var(")) v = v.replace(/var\((--[\w-]+)\)/g, (_, name) => vars[name] ?? `missing${name}`);
  // calc() here is only ever +, -, * on numbers and percentages.
  v = v.replace(/calc\(/g, "(");
  // Work out each bracketed sum, innermost first, leaving hsl(...) alone.
  const sum = /(?<![a-z])\(([\d.%\s+*-]+)\)/;
  while (sum.test(v)) {
    v = v.replace(sum, (_, expr) => `${Function(`return (${expr.replace(/%/g, "")})`)()}${expr.includes("%") ? "%" : ""}`);
  }
  return v;
}

function rgb(value, vars) {
  const m = /^hsl\(\s*([\d.-]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(resolve(value, vars));
  if (!m) throw new Error(`Can't read colour: ${value} -> ${resolve(value, vars)}`);
  const [h, s, l] = [((+m[1] % 360) + 360) % 360, Math.min(100, +m[2]) / 100, Math.min(100, +m[3]) / 100];
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
}

const luminance = (c) =>
  c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAGE = ["--background", "--card"];
const PAIRS = [
  ["--foreground", [...PAGE, "--muted", "--secondary"]],
  ["--muted-foreground", [...PAGE, "--muted", "--secondary"]],
  ["--secondary-foreground", [...PAGE, "--secondary"]],
  // text-primary resolves to --primary-text; --primary itself is a fill.
  ["--primary-text", [...PAGE, "--muted", "--secondary"]],
  ["--primary-foreground", ["--primary"]],
  ["--card", ["--secondary-foreground"]],
  ["--destructive", PAGE],
  ["--accent-foreground", ["--accent"]],
  ["--sky-foreground", ["--sky"]],
  ["--butter-foreground", ["--butter"]],
  ["--lilac-foreground", ["--lilac"]],
  ["--mint-foreground", ["--mint", "--card"]],
];

// Large headings (the gradient accent word) need 3:1.
const LARGE = ["--primary-text", "--text-2", "--text-3"];

const failures = [];
let checked = 0;
for (const theme of ["light", "dark"]) {
  for (const accent of accents) {
    const vars = {
      ...block(":root"),
      ...accentBlock(accent),
      ...light,
      ...(theme === "dark" ? dark : {}),
    };
    for (const text of LARGE) {
      for (const surface of PAGE) {
        checked++;
        const r = ratio(rgb(vars[text], vars), rgb(vars[surface], vars));
        if (r < 3) failures.push(`${theme} ${accent}: heading colour ${text} on ${surface} is ${r.toFixed(2)}:1`);
      }
    }
    for (const [text, surfaces] of PAIRS) {
      for (const surface of surfaces) {
        checked++;
        if (!vars[text]) {
          failures.push(`${theme} ${accent}: ${text} is not defined`);
          continue;
        }
        const r = ratio(rgb(vars[text], vars), rgb(vars[surface], vars));
        if (r < 4.5) failures.push(`${theme} ${accent}: ${text} on ${surface} is ${r.toFixed(2)}:1`);
      }
    }
  }
}

for (const f of failures) console.log(`FAIL  ${f}`);
console.log(failures.length ? `\n${failures.length} of ${checked} colour pairs are too faint` : `PASS  all ${checked} text colour pairs meet WCAG AA (4.5:1, or 3:1 for large headings)`);
process.exit(failures.length ? 1 : 0);

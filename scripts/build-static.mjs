import {
  cpSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "public");
const target = resolve(root, "dist");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

const vendorDir = join("vendor", "plyr");
let before = 0;
let after = 0;

function minifyTree(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);

    if (st.isDirectory()) {
      minifyTree(full);
      continue;
    }

    const ext = extname(full).toLowerCase();
    if (ext !== ".css" && ext !== ".js") continue;
    if (full.includes(vendorDir)) continue; // ya viene minificado
    if (full.endsWith(".min.js") || full.endsWith(".min.css")) continue;

    const code = readFileSync(full, "utf8");
    before += Buffer.byteLength(code);

    try {
      const result = transformSync(code, {
        loader: ext === ".css" ? "css" : "js",
        format: ext === ".js" ? "esm" : undefined,
        minify: true,
        legalComments: "none",
        target: ["es2020"],
      });
      writeFileSync(full, result.code);
      after += Buffer.byteLength(result.code);
    } catch (error) {
      after += Buffer.byteLength(code);
      console.warn(`build: no se pudo minificar ${full}: ${error.message}`);
    }
  }
}

minifyTree(target);

// Vercel Web Analytics: solo en el build de produccion (dist/), via script
// estatico same-origin. No se toca public/ (los tests sirven public/ y
// /_vercel/insights/script.js solo existe en Vercel -> evitamos un 404 local).
const indexPath = join(target, "index.html");
let indexHtml = readFileSync(indexPath, "utf8");
const cspScript =
  "script-src 'self' 'sha256-rcdORQxU/aGQWuLrI3ZDgIuUJ1T1halkel8b52AmqLU='";
const analyticsTag =
  '    <script defer src="/_vercel/insights/script.js"></script>\n  </head>';

if (indexHtml.includes("/_vercel/insights/script.js")) {
  console.warn("build: Vercel Analytics ya presente en index.html, no se reinyecta.");
} else {
  indexHtml = indexHtml
    .replace(cspScript, `${cspScript} https://va.vercel-scripts.com`)
    .replace("connect-src 'self'", "connect-src 'self' https://*.vercel-insights.com")
    .replace("</head>", analyticsTag);
  writeFileSync(indexPath, indexHtml);
  console.log("build: Vercel Web Analytics inyectado en dist/index.html.");
}

const saved = before - after;
const pct = before ? Math.round((saved / before) * 100) : 0;
console.log(
  `build: dist/ generado. CSS+JS ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (-${pct}%).`,
);

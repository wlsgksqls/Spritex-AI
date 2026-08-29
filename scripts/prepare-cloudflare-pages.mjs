import { copyFileSync, cpSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = ".open-next";
const worker = join(root, "worker.js");
const assets = join(root, "assets");

if (!existsSync(worker)) {
  throw new Error("OpenNext output is missing. Run `npx opennextjs-cloudflare build` first.");
}

// Pages advanced mode looks for _worker.js at the output root.
copyFileSync(worker, join(root, "_worker.js"));

// Next.js static files live under assets/; Pages serves the output dir as /.
if (existsSync(assets)) {
  cpSync(assets, root, { recursive: true });
}

writeFileSync(
  join(root, "_routes.json"),
  `${JSON.stringify(
    {
      version: 1,
      include: ["/*"],
      exclude: ["/_next/static/*", "/_headers", "/favicon.ico", "/BUILD_ID"],
    },
    null,
    2,
  )}\n`,
);

console.log("Prepared Cloudflare Pages output in .open-next (_worker.js + static assets).");

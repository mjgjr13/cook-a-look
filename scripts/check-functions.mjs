// Syntax-check every Supabase Edge Function (catches errors that make a
// function fail to boot, e.g. duplicate declarations). Run: npm run check:functions
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";

const dir = "supabase/functions";
const files = [
  ...readdirSync(dir).filter((d) => existsSync(`${dir}/${d}/index.ts`)).map((d) => `${dir}/${d}/index.ts`),
  ...readdirSync(`${dir}/_shared`).filter((f) => f.endsWith(".ts")).map((f) => `${dir}/_shared/${f}`),
];
let failed = 0;
for (const f of files) {
  try {
    execFileSync("npx", ["-y", "esbuild@0.24", "--log-level=error", f], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    failed++;
    console.error(`FAIL ${f}\n${e.stderr?.toString().split("\n").slice(0, 6).join("\n")}`);
  }
}
console.log(failed ? `${failed} function file(s) failed` : `All ${files.length} function files OK`);
process.exit(failed ? 1 : 0);

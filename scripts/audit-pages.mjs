// Static checks for rules a typechecker cannot see. Prints "AUDIT OK" or one line per problem.
// Usage: node scripts/audit-pages.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = "src/app";
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/^(page|layout|route)\.tsx?$/.test(name)) pages.push(p.replaceAll("\\", "/"));
  }
})(root);

// Route patterns that exist, e.g. /spaces/[connectionId]/talk -> regex
const routes = pages
  .filter((p) => /\/(page\.tsx|route\.ts)$/.test(p))
  .map((p) =>
    p
      .replace(/^src\/app/, "")
      .replace(/\/(page\.tsx|route\.ts)$/, "")
      .replace(/\/\([^)]+\)/g, "") || "/",
  );
const routeRes = routes.map((r) => new RegExp("^" + r.replace(/\[[^\]]+\]/g, "[^/]+") + "/?$"));

const problems = [];
for (const file of pages) {
  const src = readFileSync(file, "utf8");
  const inApp = file.includes("/(app)/");
  const inSpace = file.includes("/spaces/[connectionId]/");
  const inAdmin = file.startsWith("src/app/admin/");
  if (file.endsWith("page.tsx")) {
    if (inSpace && !src.includes("requireSpace(")) problems.push(`${file}: space page without requireSpace()`);
    if (inApp && !/require(Onboarded)?User\(/.test(src)) problems.push(`${file}: (app) page without requireOnboardedUser()`);
    if (inAdmin && !src.includes("requireAdmin(")) problems.push(`${file}: admin page without requireAdmin()`);
    if (inApp && /<main[\s>]/.test(src)) problems.push(`${file}: renders <main> inside the app shell`);
  }
  if (/description=\{\s*<p[\s>]/.test(src)) problems.push(`${file}: <p> passed to PageHeader description (nested <p>)`);
  // Internal links: static prefix of every href must match a real route
  for (const m of src.matchAll(/href=(?:\{`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const href = (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g, "x");
    const clean = href.split("?")[0].split("#")[0] || "/";
    if (clean.startsWith("/api/")) continue;
    if (!routeRes.some((re) => re.test(clean)) && !routeRes.some((re) => re.test(clean + "/x"))) {
      problems.push(`${file}: link to ${clean} matches no route`);
    }
  }
}
for (const p of problems) console.log(p);
console.log(problems.length ? `AUDIT FAIL ${problems.length}` : `AUDIT OK ${pages.length} files`);
process.exit(problems.length ? 1 : 0);

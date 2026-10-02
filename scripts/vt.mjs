// Runs one vitest file against its OWN test database (synapse_test_<name>), so parallel runs
// cannot truncate each other's data. Prints "VITEST OK <n>" only when every test passed.
// Usage: node scripts/vt.mjs tests/auth.test.ts
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const file = process.argv[2];
const name = path.basename(file).replace(/\.test\.tsx?$/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const base = new URL(process.env.TEST_DATABASE_URL);
base.pathname = `/synapse_test_${name}`;
const out = path.join(os.tmpdir(), `vt-${name}-${process.pid}.json`);
const run = spawnSync("npx", ["vitest", "run", file, "--reporter=json", `--outputFile=${out}`], {
  env: { ...process.env, TEST_DATABASE_URL: base.toString() },
  encoding: "utf8",
  shell: true,
});
let report;
try {
  report = JSON.parse(readFileSync(out, "utf8"));
  rmSync(out, { force: true });
} catch {
  console.log(run.stdout?.slice(-3000), run.stderr?.slice(-3000));
  console.log("VITEST FAIL: no report (the file probably failed to load)");
  process.exit(1);
}
for (const suite of report.testResults) {
  if (suite.status === "failed" && suite.message) console.log(suite.message.slice(0, 2000));
  for (const t of suite.assertionResults) {
    if (t.status !== "passed") console.log(`FAILED: ${t.fullName}\n  ${(t.failureMessages ?? []).join("\n").slice(0, 1200)}`);
  }
}
if (report.numFailedTests === 0 && report.numFailedTestSuites === 0 && report.numPassedTests > 0) {
  console.log(`VITEST OK ${report.numPassedTests}`);
} else {
  console.log(`VITEST FAIL passed=${report.numPassedTests} failed=${report.numFailedTests}`);
  process.exit(1);
}

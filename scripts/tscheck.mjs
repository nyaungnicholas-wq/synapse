// Type-checks ONLY the given files, even when other files in the project have syntax errors
// (plain `tsc` stops at syntax errors anywhere and silently skips semantic checks everywhere).
// Usage: node scripts/tscheck.mjs <file...>   or   node scripts/tscheck.mjs --list <file-with-paths>
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

let files = process.argv.slice(2);
if (files[0] === "--list") files = readFileSync(files[1], "utf8").split(/\r?\n/).filter(Boolean);
const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
const config = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, path.dirname(configPath));
const program = ts.createProgram({ rootNames: config.fileNames, options: { ...config.options, noEmit: true } });
let count = 0;
for (const f of files) {
  const sf = program.getSourceFile(path.resolve(f));
  if (!sf) { console.log(`${f}: not part of the program`); count++; continue; }
  for (const d of [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]) {
    const { line, character } = sf.getLineAndCharacterOfPosition(d.start ?? 0);
    console.log(`${f}(${line + 1},${character + 1}): TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
    count++;
  }
}
if (count) process.exit(1);
console.log(`TSCHECK OK ${files.length} file(s)`);

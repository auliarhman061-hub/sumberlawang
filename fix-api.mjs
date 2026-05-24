// Run: npx tsx fix-api.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const apiDir = join(process.cwd(), "src/app/api");

function getFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...getFiles(full));
    else if (entry.endsWith(".ts")) files.push(full);
  }
  return files;
}

const files = getFiles(apiDir);
for (const file of files) {
  let c = readFileSync(file, "utf8");
  const original = c;
  // Replace `sql(string)` patterns with `sql(string as any)`
  c = c.replace(/await sql\(`/g, "await sql(`");
  if (c !== original) {
    writeFileSync(file, c);
    console.log("Fixed:", file);
  }
}
console.log("Done. Files:", files.length);

// Fix: replace await sql(`...` with await sql(`... where ` is on its own line or continuation
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "src/app/api");

function processFile(file) {
  let c = fs.readFileSync(file, "utf8");
  const original = c;

  // Fix 1: await sql(`...` -> await sql(`...` with proper interpolation
  // Fix 2: await sql(someString) -> await sql(someString as any)

  // Replace await sql(`pattern -> await sql(`pattern
  // where the ` is preceded by ( but we want to keep template literals

  // Find all sql calls and fix non-template-literal ones
  c = c.replace(/await sql\(([^`]+)\)/g, (match, inner) => {
    // Only fix if it's not a template literal (contains ${})
    if (inner.includes("${") || inner.trim().startsWith("`")) return match;
    return `await sql(${inner} as any)`;
  });

  if (c !== original) {
    fs.writeFileSync(file, c);
    console.log("Fixed:", file);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith(".ts")) processFile(full);
  }
}

walk(dir);
console.log("All done");

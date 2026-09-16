import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const appDir = path.join(rootDir, "src", "app");

let errors = [];

function findFiles(dir, matchFn, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, matchFn, fileList);
    } else if (matchFn(fullPath)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// 1. Scan all page.tsx files under src/app
const pageFiles = findFiles(appDir, (file) => path.basename(file) === "page.tsx");

for (const file of pageFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split(/\r?\n/).length;
  const relPath = path.relative(rootDir, file).replace(/\\/g, "/");

  // Specific rule: (marketing)/page.tsx must be <= 30 lines; all other page.tsx <= 35 lines
  const maxLines = relPath.includes("(marketing)/page.tsx") ? 30 : 35;

  if (lines > maxLines) {
    errors.push(
      `[Line Count Violation] ${relPath} has ${lines} lines (max allowed: ${maxLines})`
    );
  }
}

// 2. Scan all files in src/app/(marketing) for forbidden imports
const marketingDir = path.join(appDir, "(marketing)");
const marketingFiles = findFiles(marketingDir, (file) =>
  /\.(tsx?|jsx?)$/.test(file)
);

const forbiddenPatterns = [
  /@\/shared\/lib\/prisma/,
  /features\/.*\/server/,
  /@\/features\/.*\/server/,
  /session/i,
  /auth-context/i,
  /getServerSession/i,
];

for (const file of marketingFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    if (/^\s*import\s+/.test(line)) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(line)) {
          errors.push(
            `[Boundary Violation] ${relPath}:${idx + 1} imports forbidden server/session dependency: "${line.trim()}"`
          );
        }
      }
    }
  });
}

if (errors.length > 0) {
  console.error("\n❌ Frontend Architectural Verification Failed:\n");
  errors.forEach((err) => console.error("  - " + err));
  console.error("\nResolve the violations above to conform to Frontend Architecture standards.\n");
  process.exit(1);
} else {
  console.log("✅ Frontend Architectural Verification Passed: All page.tsx files <= 35 lines and (marketing) routes isolated.");
  process.exit(0);
}

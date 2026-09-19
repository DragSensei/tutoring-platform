import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runUiArchitectureLint } from "../../../../_shared-skills/scripts/lint-ui-architecture.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const appDir = path.join(rootDir, "src", "app");
const srcDir = path.join(rootDir, "src");

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

// -----------------------------------------------------------------------------
// GATE 1: Page Orchestrators (page.tsx) must strictly remain <= 35 non-empty lines
// -----------------------------------------------------------------------------
const pageFiles = findFiles(appDir, (file) => path.basename(file) === "page.tsx");

for (const file of pageFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const nonEmptyLines = content.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const relPath = path.relative(rootDir, file).replace(/\\/g, "/");

  const maxLines = 35;

  if (nonEmptyLines > maxLines) {
    errors.push(
      `[Gate 1 - Line Count Violation] ${relPath} has ${nonEmptyLines} non-empty lines (max allowed: ${maxLines})`
    );
  }
}

// -----------------------------------------------------------------------------
// GATE 2: Disallow Prisma imports (@prisma/client, prisma) inside presentation
// components and files marked 'use client'
// -----------------------------------------------------------------------------
const allSrcFiles = findFiles(srcDir, (file) => /\.(tsx?|jsx?)$/.test(file));
const prismaImportPattern = /(?:(?:import|from|export)\s+['"][^'"]*(?:@prisma\/client|(?:\/|\b)prisma(?:\.ts)?\b)[^'"]*['"]|(?:import|require)\s*\(\s*['"][^'"]*(?:@prisma\/client|(?:\/|\b)prisma(?:\.ts)?\b)[^'"]*['"]\)?)/i;

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
  const isClient = /['"]use client['"]/.test(content);
  const isPresentationComponent =
    (relPath.includes("/components/") ||
      (relPath.includes("/_components/") && /\.(tsx|jsx)$/.test(file)) ||
      (/\.(tsx|jsx)$/.test(file) &&
        !relPath.endsWith("page.tsx") &&
        !relPath.endsWith("layout.tsx") &&
        !relPath.endsWith("template.tsx"))) &&
    !path.basename(file).endsWith(".test.tsx") &&
    !path.basename(file).endsWith(".spec.tsx");

  if (isClient || isPresentationComponent) {
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (prismaImportPattern.test(line)) {
        const reason = isClient && isPresentationComponent
          ? "client presentation component"
          : isClient
          ? "'use client' file"
          : "presentation component";
        errors.push(
          `[Gate 2 - Prisma Boundary Violation] ${relPath}:${idx + 1} imports Prisma inside a ${reason}: "${line.trim()}"`
        );
      }
    });
  }
}

// -----------------------------------------------------------------------------
// Route Isolation: Scan all files in src/app/(marketing) for forbidden imports
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// GATE 3 & AST Sentinel Integration: Run AST Component Boundary Linter
// -----------------------------------------------------------------------------
const astLint = runUiArchitectureLint(rootDir);
if (astLint.violations && astLint.violations.length > 0) {
  astLint.violations.forEach((v) => {
    errors.push(`[${v.gate} - ${v.type}] ${v.message}`);
  });
}

if (errors.length > 0) {
  console.error("\n❌ Frontend Architectural Verification Failed:\n");
  errors.forEach((err) => console.error("  - " + err));
  console.error("\nResolve the violations above to conform to Frontend Architecture standards.\n");
  process.exit(1);
} else {
  console.log("✅ Frontend Architectural Verification Passed: All page.tsx files <= 35 non-empty lines, no Prisma imports in presentation/client components, and (marketing) routes isolated.");
  process.exit(0);
}

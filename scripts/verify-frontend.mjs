import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const toolkitScripts = {
  "lint-ui-architecture": "_shared-skills/scripts/lint-ui-architecture.mjs",
  "token-lint": "_shared-skills/scripts/token-lint.mjs",
  "mock-server": "_shared-skills/scripts/mock-server.mjs",
};

async function resolveToolkitScript(name) {
  const relativeScript = toolkitScripts[name];
  if (typeof relativeScript !== "string" || !Object.hasOwn(toolkitScripts, name)) {
    throw new Error(`Unsupported toolkit script "${name}". Allowed: ${Object.keys(toolkitScripts).join(", ")}`);
  }

  const configPath = path.join(process.cwd(), ".local", "toolkit-root.json");
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    const reason = error.code === "ENOENT" ? "file is missing" : error instanceof SyntaxError ? "JSON is invalid" : error.message;
    throw new Error(`Toolkit root config ${configPath} ${reason}; expected {\"path\": \"<absolute toolkit root>\"}.`);
  }

  if (!config || typeof config.path !== "string" || !path.isAbsolute(config.path)) {
    throw new Error(`Toolkit root config ${configPath} must contain an absolute string path.`);
  }

  const toolkitRoot = path.resolve(config.path);
  const scriptPath = path.join(toolkitRoot, relativeScript);
  if (!fs.existsSync(scriptPath) || !fs.statSync(scriptPath).isFile()) {
    throw new Error(`Toolkit script is missing: ${scriptPath}`);
  }
  return scriptPath;
}

async function dispatchToolkitScript(name) {
  try {
    const scriptPath = await resolveToolkitScript(name);
    const { spawnSync } = await import("child_process");
    const result = spawnSync(process.execPath, [scriptPath, `--target=${process.cwd()}`], { cwd: process.cwd(), stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.signal) {
      console.error(`Toolkit script terminated by signal ${result.signal}.`);
      process.exit(1);
    }
    process.exit(result.status ?? 1);
  } catch (error) {
    console.error(`Toolkit script dispatch failed: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[2] === "--toolkit-script") {
  if (process.argv.length !== 4) {
    console.error("Usage: node scripts/verify-frontend.mjs --toolkit-script <lint-ui-architecture|token-lint|mock-server>");
    process.exit(1);
  }
  await dispatchToolkitScript(process.argv[3]);
}

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

// Keep searchable selection controls on the shared Combobox primitive.
for (const file of allSrcFiles.filter((file) => /\.(tsx|jsx)$/.test(file))) {
  const content = fs.readFileSync(file, "utf-8");
  const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
  content.split(/\r?\n/).forEach((line, idx) => {
    if (/<select\b/i.test(line)) {
      errors.push(`[Gate 4 - Selection Primitive] ${relPath}:${idx + 1} uses a native select; use the shared Combobox`);
    }
  });
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
let astLint;
try {
  const lintUiArchitecturePath = await resolveToolkitScript("lint-ui-architecture");
  const { runUiArchitectureLint } = await import(pathToFileURL(lintUiArchitecturePath).href);
  astLint = runUiArchitectureLint(rootDir);
} catch (error) {
  errors.push(`[Gate 3 - Toolkit Configuration] ${error.message}`);
  astLint = { violations: [] };
}
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
  console.log("✅ Frontend Architectural Verification Passed: Page size, Prisma boundaries, shared Combobox usage, and (marketing) route isolation.");
  process.exit(0);
}

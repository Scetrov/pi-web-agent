import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";

const rootDir = process.cwd();
const docTargets = ["README.md", "AGENTS.md", "docs"];

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectMarkdownFiles(targetPath) {
  const targetStat = await stat(targetPath);
  if (targetStat.isFile()) {
    return targetPath.endsWith(".md") ? [targetPath] : [];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => collectMarkdownFiles(path.join(targetPath, entry.name))),
  );
  return nested.flat();
}

function extractMermaidBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let inBlock = false;
  let startLine = 0;
  let content = [];

  lines.forEach((line, index) => {
    if (!inBlock && /^```mermaid\s*$/.test(line)) {
      inBlock = true;
      startLine = index + 1;
      content = [];
      return;
    }

    if (inBlock && /^```\s*$/.test(line)) {
      blocks.push({
        startLine,
        content: content.join("\n").trim(),
      });
      inBlock = false;
      content = [];
      return;
    }

    if (inBlock) {
      content.push(line);
    }
  });

  if (inBlock) {
    throw new Error(`Unclosed mermaid code fence starting at line ${startLine}`);
  }

  return blocks;
}

function formatError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

function installGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
  });
  const { window } = dom;

  installGlobal("window", window);
  installGlobal("document", window.document);
  installGlobal("navigator", window.navigator);
  installGlobal("DOMParser", window.DOMParser);
  installGlobal("Element", window.Element);
  installGlobal("HTMLElement", window.HTMLElement);
  installGlobal("SVGElement", window.SVGElement);
  installGlobal("Node", window.Node);
  installGlobal("getComputedStyle", window.getComputedStyle.bind(window));
  installGlobal("atob", window.atob.bind(window));
  installGlobal("btoa", window.btoa.bind(window));
}

async function main() {
  installDomGlobals();
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

  const markdownFiles = [];
  for (const target of docTargets) {
    const resolvedTarget = path.join(rootDir, target);
    if (await pathExists(resolvedTarget)) {
      markdownFiles.push(...(await collectMarkdownFiles(resolvedTarget)));
    }
  }

  const failures = [];

  for (const filePath of markdownFiles) {
    const source = await readFile(filePath, "utf8");
    let blocks = [];

    try {
      blocks = extractMermaidBlocks(source);
    } catch (error) {
      failures.push(`${path.relative(rootDir, filePath)}: ${formatError(error)}`);
      continue;
    }

    for (const block of blocks) {
      try {
        await mermaid.parse(block.content);
      } catch (error) {
        failures.push(
          `${path.relative(rootDir, filePath)}:${block.startLine}: ${formatError(error)}`,
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error("Mermaid validation failed:\n");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Validated Mermaid blocks in ${markdownFiles.length} markdown files.`);
}

await main();

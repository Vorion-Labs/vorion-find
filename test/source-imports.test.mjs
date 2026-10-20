import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanSourceImports } from "../dist/scanner/sourceImports.js";
import { collectingContext } from "./helpers.mjs";

test("source-imports finds JS/TS and Python imports and skips node_modules", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vorion-find-src-"));
  const src = path.join(dir, "src");
  fs.mkdirSync(path.join(src, "node_modules", "vendored"), { recursive: true });
  fs.writeFileSync(
    path.join(src, "agent.ts"),
    [
      'import Anthropic from "@anthropic-ai/sdk";',
      "const OpenAI = require('openai');",
      "const lazy = await import('langchain');",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(src, "pipeline.py"), "from langchain.llms import OpenAI\nimport anthropic\n");
  fs.writeFileSync(path.join(src, "node_modules", "vendored", "index.js"), "require('must-not-be-scanned');\n");

  try {
    const { evidence, ctx } = collectingContext(dir);
    const scanned = await scanSourceImports(ctx);
    assert.equal(scanned, 2, "only the two source files outside node_modules are scanned");

    const lines = evidence.flatMap((e) => e.content.split("\n"));
    for (const expected of [
      "import @anthropic-ai/sdk",
      "import openai",
      "import langchain",
      "py langchain.llms",
      "py anthropic",
    ]) {
      assert.ok(lines.includes(expected), `missing ${JSON.stringify(expected)}`);
    }
    assert.ok(!lines.some((l) => l.includes("must-not-be-scanned")), "node_modules must be skipped");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

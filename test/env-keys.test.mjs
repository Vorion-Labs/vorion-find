// The privacy promise in the README: ".env values never leave your machine — only
// the matching key names are reported." This test plants values and fails if any of
// them appears anywhere in the evidence the scanner would upload.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanEnvKeys } from "../dist/scanner/envKeys.js";
import { collectingContext } from "./helpers.mjs";

test("env-keys reports AI key names and never their values", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vorion-find-env-"));
  const fileValues = ["sk-test-openai-VALUE-must-not-leave", "sk-ant-test-VALUE-must-not-leave"];
  const processValue = "mistral-VALUE-must-not-leave";
  fs.writeFileSync(
    path.join(dir, ".env"),
    [
      "# comment line",
      `OPENAI_API_KEY=${fileValues[0]}`,
      `export ANTHROPIC_API_KEY="${fileValues[1]}"`,
      "DATABASE_URL=postgres://user:pass@db.internal/app",
      "",
    ].join("\n"),
  );
  const previous = process.env.MISTRAL_API_KEY;
  process.env.MISTRAL_API_KEY = processValue;

  try {
    const { evidence, ctx } = collectingContext(dir);
    await scanEnvKeys(ctx);

    const fromFile = evidence.find((e) => e.path === path.join(dir, ".env"));
    assert.ok(fromFile, "expected evidence for the planted .env file");
    assert.deepEqual(fromFile.content.split("\n").sort(), ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"]);

    const fromProcess = evidence.find((e) => e.path === "process.env");
    assert.ok(fromProcess?.content.split("\n").includes("MISTRAL_API_KEY"));

    const uploaded = JSON.stringify(evidence);
    for (const value of [...fileValues, processValue, "postgres://", "DATABASE_URL"]) {
      assert.ok(!uploaded.includes(value), `evidence must not contain ${JSON.stringify(value)}`);
    }
  } finally {
    if (previous === undefined) delete process.env.MISTRAL_API_KEY;
    else process.env.MISTRAL_API_KEY = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

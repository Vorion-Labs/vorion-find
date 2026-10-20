import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../dist/args.js";

test("defaults: standard depth, no pairing, uploads enabled", () => {
  const a = parseArgs([]);
  assert.equal(a.depth, "standard");
  assert.equal(a.pair, "");
  assert.equal(a.dryRun, false);
  assert.equal(a.stdout, false);
});

test("accepts --flag=value and --flag value forms", () => {
  const a = parseArgs(["--pair=NEW", "--depth", "deep", "--dry-run", "--cwd=/tmp/project"]);
  assert.equal(a.pair, "NEW");
  assert.equal(a.depth, "deep");
  assert.equal(a.dryRun, true);
  assert.equal(a.cwd, "/tmp/project");
});

test("rejects an unknown depth instead of silently scanning differently", () => {
  assert.throws(() => parseArgs(["--depth=ludicrous"]), /Invalid --depth/);
});

test("rejects unknown flags", () => {
  assert.throws(() => parseArgs(["--upload-everything"]), /Unknown flag/);
});

test("stops parsing options at --", () => {
  const a = parseArgs(["--", "--help"]);
  assert.equal(a.help, false);
});

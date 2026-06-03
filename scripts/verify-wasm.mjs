#!/usr/bin/env node
// Verifies the committed python.wasm is byte-identical to what the pinned
// source rebuilds to. CI gate.
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pin = (await readFile(path.join(repoRoot, ".grammar-pin"), "utf-8")).trim();
const committed = await readFile(path.join(repoRoot, "python.wasm"));
const committedHash = createHash("sha256").update(committed).digest("hex");
console.log(`committed python.wasm sha256: ${committedHash}`);

const work = await mkdtemp(path.join(tmpdir(), "grammar-python-verify-"));
await run("git", ["clone", "--no-checkout", "https://github.com/tree-sitter/tree-sitter-python.git", "src"], { cwd: work });
await run("git", ["checkout", pin], { cwd: path.join(work, "src") });
await run("npm", ["install", "--no-save", "tree-sitter-cli@^0.26.0"], { cwd: work });
const cli = path.join(work, "node_modules", ".bin", "tree-sitter");
await run(cli, ["generate"], { cwd: path.join(work, "src") });
await run(cli, ["build", "--wasm"], { cwd: path.join(work, "src") });

const rebuilt = await readFile(path.join(work, "src", "tree-sitter-python.wasm"));
const rebuiltHash = createHash("sha256").update(rebuilt).digest("hex");
console.log(`rebuilt python.wasm sha256: ${rebuiltHash}`);

if (committedHash !== rebuiltHash) {
    console.error("FAIL: committed python.wasm does not match rebuild from pinned source");
    process.exit(1);
}
console.log("OK: bytes identical");

function run(cmd, args, opts) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: "inherit", ...opts });
        child.on("error", reject);
        child.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
        });
    });
}

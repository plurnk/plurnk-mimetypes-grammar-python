#!/usr/bin/env node
// Reproducible WASM build for tree-sitter-python.
//
// Clones the upstream grammar at the pinned commit in .grammar-pin, runs
// `tree-sitter generate && tree-sitter build --wasm`, and writes python.wasm
// at the package root.
import { mkdtemp, readFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pinPath = path.join(repoRoot, ".grammar-pin");
const wasmPath = path.join(repoRoot, "python.wasm");

const pin = (await readFile(pinPath, "utf-8")).trim();
if (!/^[0-9a-f]{7,40}$/i.test(pin)) {
    throw new Error(`.grammar-pin must be a git commit SHA, got: ${pin}`);
}

const work = await mkdtemp(path.join(tmpdir(), "grammar-python-build-"));
console.log(`build root: ${work}`);

await run("git", ["clone", "--no-checkout", "https://github.com/tree-sitter/tree-sitter-python.git", "src"], { cwd: work });
await run("git", ["checkout", pin], { cwd: path.join(work, "src") });
await run("npm", ["install", "--no-save", "tree-sitter-cli@^0.26.0"], { cwd: work });

const cli = path.join(work, "node_modules", ".bin", "tree-sitter");
await run(cli, ["generate"], { cwd: path.join(work, "src") });
await run(cli, ["build", "--wasm"], { cwd: path.join(work, "src") });

const built = path.join(work, "src", "tree-sitter-python.wasm");
await copyFile(built, wasmPath);
const bytes = (await readFile(wasmPath)).length;
console.log(`python.wasm: ${bytes} bytes (built from ${pin})`);

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

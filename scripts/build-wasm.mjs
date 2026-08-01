#!/usr/bin/env node
// Reproducible tree-sitter-python WASM build under {§grammar-leaf-reproducibility}.
import { mkdtempDisposable, readFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pinPath = path.join(repoRoot, ".grammar-pin");
const wasmPath = path.join(repoRoot, "python.wasm");

const source = (await readFile(path.join(repoRoot, ".grammar-source"), "utf-8")).trim();
const pin = (await readFile(pinPath, "utf-8")).trim();
if (!/^[0-9a-f]{40}$/i.test(pin)) {
    throw new Error(`.grammar-pin must be a full git commit SHA, got: ${pin}`);
}

await using temporary = await mkdtempDisposable(path.join(tmpdir(), "grammar-python-build-"));
const work = temporary.path;
console.log(`build root: ${work}`);

await run("git", ["init", "--quiet", "src"], { cwd: work });
await run("git", ["fetch", "--quiet", "--depth=1", source, pin], { cwd: path.join(work, "src") });
await run("git", ["checkout", "--quiet", "--detach", "FETCH_HEAD"], { cwd: path.join(work, "src") });

const cli = path.join(repoRoot, "node_modules", ".bin", "tree-sitter");
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

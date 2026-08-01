#!/usr/bin/env node
// Verifies the committed python.wasm is byte-identical to what the pinned
// source rebuilds to. CI gate.
import { mkdtempDisposable, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (await readFile(path.join(repoRoot, ".grammar-source"), "utf-8")).trim();
const pin = (await readFile(path.join(repoRoot, ".grammar-pin"), "utf-8")).trim();
if (!/^[0-9a-f]{40}$/i.test(pin)) {
    throw new Error(`.grammar-pin must be a full git commit SHA, got: ${pin}`);
}
const committed = await readFile(path.join(repoRoot, "python.wasm"));
const committedHash = createHash("sha256").update(committed).digest("hex");
console.log(`committed python.wasm sha256: ${committedHash}`);

await using temporary = await mkdtempDisposable(path.join(tmpdir(), "grammar-python-verify-"));
const work = temporary.path;
await run("git", ["init", "--quiet", "src"], { cwd: work });
await run("git", ["fetch", "--quiet", "--depth=1", source, pin], { cwd: path.join(work, "src") });
await run("git", ["checkout", "--quiet", "--detach", "FETCH_HEAD"], { cwd: path.join(work, "src") });
const cli = path.join(repoRoot, "node_modules", ".bin", "tree-sitter");
await run(cli, ["generate"], { cwd: path.join(work, "src") });
await run(cli, ["build", "--wasm"], { cwd: path.join(work, "src") });

const rebuilt = await readFile(path.join(work, "src", "tree-sitter-python.wasm"));
const rebuiltHash = createHash("sha256").update(rebuilt).digest("hex");
console.log(`rebuilt python.wasm sha256: ${rebuiltHash}`);

if (committedHash !== rebuiltHash) {
    throw new Error("committed and rebuilt WASM bytes differ");
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

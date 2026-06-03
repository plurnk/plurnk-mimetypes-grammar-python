// Pre-built tree-sitter-python WASM grammar for @plurnk/plurnk-mimetypes.
//
// This package ships exactly one thing: python.wasm at the package root,
// reachable via the "./python.wasm" subpath export. The framework's
// TreeSitterLanguageHandler resolves it at runtime and hands it to
// web-tree-sitter's Language.load().
//
// There is no JS API to call. This file exists to give Node a default entry
// point for `import "@plurnk/plurnk-mimetypes-grammar-python"`, which the
// framework uses to detect presence via `import.meta.resolve()`. The export
// is the wasm-relative path so callers (almost always the framework) can
// route directly to the binary.
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute filesystem path to the bundled python.wasm. */
export const wasmPath = path.join(here, "python.wasm");

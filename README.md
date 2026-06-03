# @plurnk/plurnk-mimetypes-grammar-python

Pre-built `tree-sitter-python` WASM grammar for the [@plurnk/plurnk-mimetypes](https://github.com/plurnk/plurnk-mimetypes) framework.

## install

```
npm i @plurnk/plurnk-mimetypes-grammar-python
```

That's it — the framework automatically picks up the bundled WASM and enables Python (`text/x-python`) support.

## what's in here

- **`python.wasm`** — pre-built from the pinned upstream [tree-sitter-python](https://github.com/tree-sitter/tree-sitter-python) commit (recorded in `.grammar-pin`)
- `scripts/build-wasm.mjs` — reproducible build from the pinned source
- `scripts/verify-wasm.mjs` — CI check that the committed WASM matches a fresh rebuild byte-for-byte

There is no runtime code here. The framework's `TreeSitterLanguageHandler` resolves the WASM via `import.meta.resolve("@plurnk/plurnk-mimetypes-grammar-python/python.wasm")` and loads it through `web-tree-sitter`.

## why a separate package

Plurnk's "support every grammar" promise is paid for by per-grammar packages. The framework alone is small; you install only the grammars you actually use. Want Python? Install this. Want everything? `npm i @plurnk/plurnk-mimetypes-grammars-all`.

This model also kills the long-standing peer-dependency conflict between upstream `tree-sitter-{lang}` packages (which all declare different peer ranges of the native `tree-sitter` binding, which we don't need). Our grammar packages declare only `web-tree-sitter` as a peer — no node-gyp, no conflicts, ever.

## license

MIT. The bundled `python.wasm` is built from the upstream tree-sitter-python grammar, which is MIT-licensed; see the pinned commit for that project's attribution.

# Hello-world static site

One hand-written HTML file served at `/`. Per ADR-001 §4/§6 there is no
`package.json`, no lockfile, no `node_modules` and no build configuration
anywhere in the repository — a reviewer confirms that with `ls`.

```
site/
├── index.html                            the whole site
├── docs/launch-verification-RFC-1.md     the verification record (human-readable)
├── scripts/check-contract.sh             the only check; POSIX shell, no Node
└── tests/                                POSIX shell test suite
```

## Verify

```sh
site/scripts/check-contract.sh   # static contract: doctype, charset, viewport,
                                 # title, "Hello, world!", no <script>, no
                                 # external asset URL, no build toolchain
site/tests/run-tests.sh          # the test suite
```

Both need only `sh`, `grep` and `find`. There is nothing to install.

## Deploy

Upload `site/index.html` as the document for `/` on any static host that
terminates HTTPS. No build step runs.

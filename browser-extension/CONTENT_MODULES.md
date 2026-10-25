# Browser content source modules

Edit source modules, then run `node tools/build-content.cjs` from the project root.
Before loading the unpacked extension, run `node tools/build-content.cjs --check`.
Both packaging scripts build automatically. Do not edit `content_bundle.js`.

| Source | Responsibility |
| --- | --- |
| `content_i18n.js` | Eight-language panel table, rendering and locale changes |
| `content_panel.js` | Panel DOM, controls and status presentation |
| `content_dom.js` | Editor/DOM access, activation primitives, visible text and platform helpers |
| `content_protocol.js` | JSON and message envelope parsing |
| `AI_CHANGE_REQUIRES_APPROVAL/content_runtime.js` | Shared state, IPC, instance ownership and route/scan scheduling |
| `AI_CHANGE_REQUIRES_APPROVAL/content_submission.js` | Submission guards, confirmation and retry semantics |
| `AI_CHANGE_REQUIRES_APPROVAL/content_delivery.js` | Inbound delivery, draft policy and reply correlation |
| `AI_CHANGE_REQUIRES_APPROVAL/content_outbound.js` | Reply scans, tools, deduplication and outbound delivery |
| `content.js` | Runtime listeners, startup/teardown wiring and existing Node test exports |

## Assembly contract

These are build-time source fragments, not independently executed browser modules.
`content_assembly.json` orders named sections. A section starts with
`// @content-section <id>` and continues to the next marker or end of file.
Keep all code inside a named section. Existing functions can be edited in their
own file without changing the assembly plan. New sections need an explicit plan entry.

The builder joins all sections into ONE IIFE, in the original statement order.
There is one set of lexical variables, one copy of each function and no runtime
`eval`, dynamic imports or extra global state. Repeated section markers, missing
sections and stray code are build errors. Browser registration and popup manual
injection load only `content_bundle.js` after the existing selector dependencies.

The initial split preserves the normalized baseline IIFE body byte for byte.
The plan records the baseline commit and body hash; subsequent feature changes
may intentionally change that hash and require their own authorization/regression.
Source modules are not copied into extension packages. The generated bundle and
staging/ZIP outputs are local, Git-ignored artifacts. After a fresh checkout, run
`node tools/build-content.cjs` before loading the repository as an unpacked extension.
Packaging runs that build automatically; do not force-add its outputs to Git.

## Editing discipline

UI changes should normally touch `content_panel.js`, `content_i18n.js`, or CSS,
not protected delivery code. A DOM helper change can still change submission
behavior: review its callers and perform the corresponding scenario regression.
Do not copy state into individual source files or load them separately via manifest.
Read the protected directory README before changing its implementation or assembly order.

Historical one-off `tools/i18n/patch_panel_*.py` migrations are retired after this
split. They target the former monolith and must not be rerun; edit source modules
directly instead. Legacy diagnostic extraction now resolves named functions from
the assembled source rather than fixed line numbers.

## Validation after the split

The owner requested completing the split before executing tests. No runtime or
real-conference test result is implied by assembling or parsing JavaScript.
After approval to test: build, run Node tests and popup tests, build isolated test
packages, then verify the real meeting scenario. Do not reload the user's active
AI pages or overwrite a running release solely to validate this refactor.

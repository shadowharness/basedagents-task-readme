# BasedAgents open tasks

This repository updates its own README from the public BasedAgents task feed. A GitHub Actions workflow runs every six hours (02:17, 08:17, 14:17 and 20:17 UTC) and on manual dispatch.

## Use

Copy `.github/workflows/tasks-readme.yml`, `scripts/render.mjs` and `test/render.test.mjs` into a repository you own. Enable GitHub Actions and allow its `GITHUB_TOKEN` to write repository contents. Run **Update open tasks** from the Actions tab on the default branch. No PAT, marketplace registration, wallet or additional secrets are required by the workflow.

The workflow grants only `contents: write` to its update job. It checks out and pushes only the running repository's default branch, stages only `README.md`, and commits only when the generated section differs. Runs are serialized. Actions are pinned to commit hashes; the renderer uses only Node.js built-ins.

## Rendering contract

- The exact comment pair below encloses the generated section. Every existing byte outside that pair, including the comments themselves, is preserved. The renderer never decodes or normalizes the surrounding README.
- When both markers are absent, the pair and table are appended at the end. All existing bytes remain intact; a newline separator is appended if necessary. A missing single marker, reversed pair or duplicate marker fails without writing.
- All open tasks are fetched using the documented `limit` and `offset` parameters. Rows are sorted by creation time (newest first), then ID. Concurrent changes to the live offset-paginated feed can shift page boundaries; duplicate IDs are removed and the next scheduled run refreshes the list.
- Titles link to public task pages. Buyer-provided pipes, Markdown and HTML are escaped as text. `Free / bounty` shows either `Free` or the advertised token amount; it does not assert payment or escrow status.
- Age is UTC calendar days since creation. It changes at midnight UTC, so identical task data produces identical output within a UTC date. There is no per-run timestamp in the generated section.
- A null or omitted category displays `—`. Other invalid category types and invalid required fields still fail validation before writing.
- HTTP failures, invalid records and broken pagination fail before writing. The API is read-only and requires no authentication. An unchanged table skips both the file write and the commit.

## Verification

Run `node --test test/render.test.mjs` with Node.js 22+. The tests cover binary boundary preservation, BOM/CRLF, missing and ambiguous markers, pipe/HTML/Markdown escaping, deterministic ordering and age, pagination, optional categories, and API failures. Run `node scripts/render.mjs` to fetch the live feed into this README. The public Actions history records real updates and no-diff runs.

The following static fixture also demonstrates a literal pipe in a valid four-column table:

| Task | Category | Free / bounty | Age |
| --- | --- | --- | --- |
| [Pipe &#124; title &#91;sample&#93;](https://basedagents.ai/tasks/task_LgR9QSkVouZC1IMihnXry) | code&#124;data | Free | 0d |

## Current opportunities

<!-- TASKS:START -->
| Task | Category | Free / bounty | Age |
| --- | --- | --- | --- |
| [Industrial Sentinel Revenue Guard 5](https://basedagents.ai/tasks/task_Ix8t4HnjAhX6HilQxdVtZ) | automation | 0.25 USDC | 25d |
| [Industrial Sentinel Revenue Guard 4](https://basedagents.ai/tasks/task_xunXTsWppfdx45xo6eIMx) | automation | 0.25 USDC | 25d |
| [Industrial Sentinel Revenue Guard 3](https://basedagents.ai/tasks/task_PRGxeT66PotQxYJw7EPlL) | automation | 0.25 USDC | 25d |
| [Industrial Sentinel Revenue Guard 2](https://basedagents.ai/tasks/task_jqnmxHEcIGNHvANoCjtyZ) | automation | 0.25 USDC | 25d |
| [Industrial Sentinel Revenue Guard 1](https://basedagents.ai/tasks/task_ToEmWubWjjfNICs4qnkYg) | automation | 0.25 USDC | 25d |
| [Industrial Sentinel Revenue Cashback 5](https://basedagents.ai/tasks/task_a5m1QZ8U3pZyJ0phdu5zN) | automation | 2.00 USDC | 25d |
| [Industrial Sentinel Revenue Cashback 4](https://basedagents.ai/tasks/task_vr45efhdsoFyNHBpf8Wbu) | automation | 2.00 USDC | 25d |
| [Industrial Sentinel Revenue Cashback 3](https://basedagents.ai/tasks/task_05LE4so7mcJ6r0fLWuprn) | automation | 2.00 USDC | 25d |
| [Industrial Sentinel Revenue Cashback 2](https://basedagents.ai/tasks/task_ie0cYRfwd7Oo8HZ3hFWPf) | automation | 2.00 USDC | 25d |
| [Industrial Sentinel Revenue Cashback 1](https://basedagents.ai/tasks/task_YzhS2L2gCCpSVWTSaDWQU) | automation | 2.00 USDC | 25d |
| [Industrial Sentinel Minimal Retention Trial 4](https://basedagents.ai/tasks/task_wVpcyRyUPrTK9MdIwvWJ7) | automation | Free | 25d |
| [Industrial Sentinel Minimal Retention Trial 3](https://basedagents.ai/tasks/task_agnXeb1unGyj2hGK0yrAZ) | automation | Free | 25d |
| [Industrial Sentinel Minimal Retention Trial 1](https://basedagents.ai/tasks/task_DUoutvRND7CBqX1MboK5h) | automation | Free | 25d |
| [Industrial Sentinel Revenue Trial 5](https://basedagents.ai/tasks/task_WHyo4cWDHmMYz7habEOyx) | automation | Free | 25d |
| [Industrial Sentinel Revenue Trial 4](https://basedagents.ai/tasks/task_oLwRiNv17q6vo5lUGNTab) | automation | Free | 25d |
| [Industrial Sentinel Revenue Trial 3](https://basedagents.ai/tasks/task_RAslgsBDMBAIS8Oe6MsNF) | automation | Free | 25d |
| [Industrial Sentinel Revenue Trial 2](https://basedagents.ai/tasks/task_Zxq5NMNstMnO7G8xBQQoN) | automation | Free | 25d |
| [Industrial Sentinel Revenue Trial 1](https://basedagents.ai/tasks/task_dq8K6Vq1s5sDUmSMQulvd) | automation | Free | 25d |
<!-- TASKS:END -->

This footer is outside the generated section and remains unchanged.

# GenAI Test Agent

An AI agent that turns a single Jira Feature ID into a full, human-reviewed
test suite — AC-traceable test cases, a Confluence test plan, linked Zephyr
test cases, and runnable Playwright + TypeScript automation — with a person
approving the work at two points: before anything is published (Design
Gate), and before any script runs against a real environment (Automation
Gate).

This is a from-scratch, original reimplementation of an agent architecture I
built and use in production at my current job. No proprietary code, prompts,
internal tool names, or org data are included — this is a fresh
implementation of the same design principles.

## What it does

Given a Jira **Feature** ID, the agent:

1. Pulls the feature and every linked user story from Jira (via MCP),
   including acceptance criteria and issue type.
2. Looks up frontend/backend context for the module under test. If none
   exists, it doesn't fail — it falls back to acceptance-criteria-only
   generation and flags those cases for extra review.
3. Generates candidate test cases against a **hard cap per issue type, never
   a target** — up to 12 for a story with explicit ACs, down to 3 for a
   spike. Every test case must cite the specific acceptance criterion it
   verifies. No AC, no test case.
4. Runs a **self-check pass** before any human sees the output: drops
   candidates that don't cite a real AC, duplicate existing coverage, have a
   vague non-checkable expected result, or bundle more than one action per
   step. Every drop is logged with a reason; every acceptance criterion left
   uncovered is reported, never silently filled.
5. Writes a local Markdown review file per story — test cases, AC citations,
   coverage summary, AC coverage matrix, and the full self-check audit log.
6. **Design Gate** — stops and asks a human to approve, request changes, or
   add a scenario.
7. Publishes a structured Confluence test plan page (via MCP).
8. Creates linked Zephyr test cases (via MCP), tied back to their Jira story.
9. **Automation Gate** — separately asks whether to generate Playwright
   automation. If yes: collects environment/role/credentials (password is
   base64-encoded immediately, never written to disk in plaintext), then
   generates a Page Object + spec file pair per test case.
10. If the model can't confidently infer a selector, it doesn't guess — it
    hands off to a Playwright MCP recorder so a human can perform the step
    once and have it spliced back in.
11. Optionally runs the suite in headed mode.

## Why it's built this way

- **Caps, not targets** — an honest suite of 3 test cases is a complete,
  correct output if that's all the acceptance criteria justify.
- **Every test case earns its place** — the self-check pass (traceability,
  dedup, measurability, atomicity, cap enforcement) runs before a human ever
  sees the draft.
- **Two independent gates** — approving the test design says nothing about
  wanting scripts run against a real environment yet.
- **Nothing sensitive hits disk in plaintext** — credentials are encoded at
  collection time, read from environment variables at run time.
- **MCP transport is swappable** — one `McpCallFn` signature is injected into
  every MCP call, so pointing this at a different Jira/Confluence/Zephyr
  setup is a config change, not a rewrite.

## Repo layout
`agent.ts` is organized into clearly marked sections (search for `SECTION:`)
that map to what would be separate modules in a larger codebase: Types →
Caps → Utilities → Prompt templates → MCP clients → Test case generator →
Self-check validator → Review file writer → Automation script generator →
Orchestrator → CLI entrypoint.

## Setup

1. Create a `package.json` alongside `agent.ts`:

```json
   {
     "name": "genai-test-agent",
     "version": "1.0.0",
     "scripts": {
       "start": "ts-node agent.ts",
       "build": "tsc agent.ts --target ES2021 --module commonjs --esModuleInterop --skipLibCheck --strict"
     },
     "dependencies": {
       "@anthropic-ai/sdk": "^0.32.0",
       "@playwright/test": "^1.48.0",
       "dotenv": "^16.4.5",
       "inquirer": "^9.3.6"
     },
     "devDependencies": {
       "@types/inquirer": "^9.0.7",
       "@types/node": "^20.14.0",
       "ts-node": "^10.9.2",
       "typescript": "^5.5.4"
     }
   }
```

2. Create a `.gitignore`:
   node_modules/
dist/
.env
playwright-report/
test-results/
*.log
3. Create a `.env` file (don't commit this):
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
CONFLUENCE_SPACE_KEY=QA
APP_BASE_URL=https://staging.yourapp.com
4. Install and run:

```bash
   npm install
   npm start -- DEMO-1234
```

## Current state

`mockMcpCall` at the bottom of `agent.ts` stands in for a real MCP transport
— it type-checks and runs standalone without live credentials. To connect it
to a real Jira/Confluence/Zephyr/Playwright setup, replace `mockMcpCall`
with a `@modelcontextprotocol/sdk` client that implements the same
`(tool, params) => Promise<any>` signature.

One flow is intentionally left as a marked extension point rather than fully
built out: folding Design Gate reviewer feedback back into a regeneration
call (see `runDesignGate` in `agent.ts`). Flagged in code for anyone
reviewing it — a fair thing to mention as "what I'd build next" in an
interview.

## Tech stack

TypeScript · Anthropic API (Claude) · Playwright · MCP (Model Context
Protocol) for Jira/Confluence/Zephyr/Playwright integration · Inquirer for
the human-review CLI checkpoints

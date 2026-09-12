# AGENTS.md

GitHub Action: sync YAML `parameters` to AWS SSM Parameter Store under `path_prefix`. Orphans under prefix get deleted.

## Layout

- `src/index.js` — entry (`@actions/core` inputs, SSM sync)
- `src/utils.js` — parse/normalize `parameters` YAML
- `dist/index.js` — bundled output (`pnpm run build`); `action.yaml` runs this
- `action.yaml` — inputs: `path_prefix`, `parameters` (both required), `tier` (default `Standard`), `kms_key_id`

## Dev

- Node 24+ (`.nvmrc`), pnpm v12.x
- `pnpm install` → `pnpm run build` before release or CI that uses `dist/`
- Local: copy `.env.example` → `.env`, `docker compose up`, `pnpm start` (needs `AWS_ENDPOINT_URL` for LocalStack/Floci)
- Inputs are read as `INPUT_<NAME>` env vars; `.env.example` covers all four
- CI: `.github/workflows/tests.yaml` — Floci on `:4566`, 

## Constraints

- All params treated as `SecureString`; names prefixed with `path_prefix`
- `path_prefix` must start with `/` and hold at least one segment; `/` and empty segments (`//`) are refused
- `kms_key_id` is optional; when unset AWS uses the account's default SSM key
- AWS creds/region via default SDK chain (use `configure-aws-credentials` in workflows)
- Keep changes small; match existing ESM + `@aws-sdk/client-ssm` style

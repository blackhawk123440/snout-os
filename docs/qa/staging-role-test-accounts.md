# Staging Role Test Accounts

Use `POST /api/ops/command-center/seed-fixtures` as an owner/admin in staging to ensure these accounts exist:

- owner: `owner@example.com` / `e2e-test-password`
- sitter: `sitter@example.com` / `e2e-test-password`
- client: `client@example.com` / `e2e-test-password`

If `ENABLE_E2E_AUTH=true` (or `ENABLE_E2E_LOGIN=true`) and `E2E_AUTH_KEY` is configured, you can also use:

- `POST /api/ops/e2e-login` with header `x-e2e-key: <E2E_AUTH_KEY>`
- body example: `{ "role": "sitter" }` or `{ "role": "client" }`

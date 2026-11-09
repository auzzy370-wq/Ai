# Security

## Trust boundaries

- **Platform control plane** (Next.js app, Postgres, Redis): trusted operators only.
- **Candidate workspaces**: untrusted source, uploads, and AI-generated instructions.
- **Cybersecurity labs**: intentionally vulnerable apps confined to the sandbox; never external targets.

## Execution isolation

1. Prefer disposable microVMs (Firecracker) or gVisor in production.
2. Docker mode: `--network none` for tests, CPU/memory/pids limits, `--read-only`, `--cap-drop ALL`, `no-new-privileges`, workspace mounted read-only where possible.
3. Never mount Docker socket into candidate containers.
4. Strip host secrets from job environment.
5. Auto-destroy environments after job completion; retain audit metadata.

## Application controls

- Argon-strength bcrypt password hashes (cost 12).
- HTTP-only session cookies, SameSite=Lax.
- RBAC on every mutating API.
- Rate limiting via Redis.
- PDF résumé magic-byte + size validation.
- Audit log for auth, assignment, execution, review, incident actions.
- AI keys only via environment variables / provider `apiKeyEnv` indirection.

## Assessment ethics

Human oversight is mandatory for qualification outcomes. Provide accommodations fields. Do not claim population percentiles without statistical validation.

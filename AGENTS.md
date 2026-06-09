# AGENTS.md

Guidance for AI agents working in this repository.

## Repository status

This is a **starter repository** with no application source code yet. The only tracked file besides this document is `README.md` (`# Ai`).

There are currently:

- No package manifests (`package.json`, `pyproject.toml`, etc.)
- No Docker or compose configuration
- No CI workflows, tests, or lint configuration
- No runnable services

When application code is added, update this file with stack-specific run, test, and lint instructions.

## Cursor Cloud specific instructions

### Services

No services need to be started. There is no API, frontend, database, or background worker defined in the repo.

### Dependency refresh

The VM update script is a no-op (`true`) because the repository has no installable project dependencies. After adding a package manager manifest, replace the update script with the appropriate install command (for example `npm install`, `pnpm install`, or `pip install -r requirements.txt`).

### Lint / test / run

Not applicable until source code and tooling are added. Once a stack is chosen, document the standard commands here and in `README.md`.

### Git

- Default branch: `main`
- Remote: `origin` on GitHub (`auzzy370-wq/Ai`)

### VM tooling available

The Cloud Agent VM includes Git, Node.js (via nvm), pnpm, npm, and Python 3. No stack-specific version files exist in this repo yet.

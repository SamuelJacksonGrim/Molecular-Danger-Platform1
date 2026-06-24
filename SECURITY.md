# Security & Responsible Disclosure

The Molecular Danger Assessment Platform is a client-side hazard-**recognition**
tool. It runs entirely in the browser and has no server component, so there is no
remote attack surface and no user data leaves the device (apart from optional
PubChem lookups).

## What we consider a security-relevant report

Because this is a safety tool, the most valuable reports are **detection gaps**:

- A **false negative** — a structure that should match a hazard signature but
  does not (e.g. a SMARTS pattern that fails to fire on a known agent or
  energetic). These are tracked like security bugs and validated against the
  fixtures in `tests/fixtures/`.
- A **false positive** that could mislead a user about a benign compound.
- Any client-side issue (XSS via crafted input, dependency vulnerability, etc.).

## How to report

Open a **private** report rather than a public issue for anything that could
mislead a user about a hazard:

- Use GitHub's "Report a vulnerability" (Security advisories) on this repo, or
- Contact the maintainer directly.

Please include the SMILES string, the expected vs. actual result, and the
RDKit build you were running, so the case can be added as a regression test.

## Scope and intent

This project recognizes and explains hazards in structures the user provides. It
does not generate hazardous structures, propose syntheses, or supply procedures,
and reports that request such additions are out of scope. See [`TERMS.md`](./TERMS.md)

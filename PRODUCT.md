# Product

## Register

product

## Users

Buku serves the **internal finance function of a single company**, working under role-based access with enforced **segregation of duties** (the app defines ACCOUNTANT, APPROVER, ADMIN, and read-only VIEWER roles):

- **Accountants / bookkeepers** draft and record transactions daily: sales invoices, purchase bills, payments, and manual journals.
- **Approvers** review and post documents and close periods. Segregation of duties means whoever creates a document generally cannot also approve or post it.
- **Admins** manage master data (chart of accounts, partners, tax codes), company settings, and the year-end close / reopen.
- **Viewers** (e.g. an owner, manager, or auditor) read the dashboard and reports without mutating anything.

**Context:** focused, repeat-visit desk work on high-stakes financial data, in Indonesian, keyboard-heavy for data entry. Traceability and correctness matter more than raw speed.

**Job to be done:** keep accurate, auditable books for the company, run the transaction cycles cleanly, and close each period and the fiscal year with confidence.

## Product Purpose

Buku is the **accounting system of record for a single Indonesian company**, built to Indonesian accounting standards (SAK/PSAK) and tax rules (PPN / PPh). It covers the full cycle: chart of accounts and master data (partners, tax codes); the sales-invoice and purchase-bill cycles; payments with allocation; manual journals; a financial-position dashboard; six standard reports; period and year-end close; an audit log; and company settings including the segregation-of-duties policy.

Success is books that are **correct, compliant, and auditable**, with a period and year-end close that holds up to scrutiny. It is explicitly not optimized to be a flashy analytics dashboard or a raw data-entry speed tool; those are secondary to trust.

## Brand Personality

Composed, institutional, and premium, never startup-loud. The voice is calm and precise; the tone is trustworthy and unambiguous.

- **Three words:** composed, institutional, trustworthy.
- **Emotional goal:** make a high-stakes financial action feel calm and certain. Restraint should read as competence, the confidence of a serious system of record.

(The visual system in DESIGN.md carries this: one institutional-blue accent, a premium navy surface, legible tabular figures, generous restrained spacing.)

## Anti-references

- **Startup-loud SaaS dashboards:** gradient hero-metrics, neon accents, mascots, marketing flourish bolted onto a data-entry tool.
- **Colour-as-decoration:** a second competing accent, rainbow status systems, or state conveyed by colour alone with no icon or label.
- **Dark-mode-with-purple-gradients / glassmorphism** clichés.
- **Fake polish:** placeholder / lorem content, fake-precise numbers, `<div>` mock screenshots, ornament that does not clarify a decision.
- **Consumer-finance gamification:** streaks, confetti, celebratory animation that trivializes accounting work.

## Design Principles

1. **Correctness before flourish.** The books must be right: every figure, status, and total is exact and traceable. Never trade accuracy or the audit trail for visual appeal or speed.
2. **Account for every state.** Loading, empty, error, not-found, and permission-denied are designed, not afterthoughts. A screen that can fail must show how it fails.
3. **Say it plainly, in the user's language.** Indonesian-first copy and domain-accurate terms (SAK/PSAK, PPN, PPh). No ambiguous status; words carry meaning that colour alone never should.
4. **Restraint is competence.** Calm, uncluttered screens with a single action colour signal a serious system of record. Remove ornament that does not help a decision.
5. **Guardrails are features, not obstacles.** Segregation of duties, role permissions, and closed-period locks protect the books. Surface them clearly so users understand why an action is blocked, rather than hiding or apologizing for them.

## Accessibility & Inclusion

Target **WCAG 2.2 AA**, reaching AAA where it is inexpensive (body ink and the navy surfaces already clear AAA). Carried in the code and DESIGN.md:

- **State is icon + text, never colour alone** (colour-blind safe).
- A **visible focus ring** on every control and custom link.
- Controls at **32px density**, which exceeds the 24px AA target; the 44px AAA target is deliberately not pursued for this dense desktop tool.
- **All motion honours `prefers-reduced-motion`.**
- **Contrast verified:** white-on-blue 4.6:1, ink-on-surface ~17:1; tinted status chips and soft buttons use AA-safe `-strong` foregrounds.
- **Indonesian-language** throughout (`useT()`).

<!--
Written by /impeccable init on 2026-07-05, grounded in the codebase, DESIGN.md, and CLAUDE.md.
Register (product), primary user (internal finance team of one company), and primary outcome
(accurate, auditable books + a clean close) confirmed by the product owner.
-->

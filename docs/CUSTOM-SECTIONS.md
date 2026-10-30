# Custom content sections

My sections adds independent content after Gallery and before Commissions. Existing Hero, Gallery, Commissions and social links retain their existing content and controls. The initial sections list is empty.

## Artist steps

1. Open Start here, then My sections > Add section.
2. Enter Section title and Text, choose an optional photo, or use a photo without text. Plain text line breaks are kept; HTML/formatting code is displayed as text.
3. Check Preview (not saved). New sections start hidden. Enable Show this section on my website when ready.
4. Choose Save section and wait for Saved. Open website shows the last published page; deployment can take a few minutes.
5. Edit section changes an existing section. Hide section / Show section and Up / Down save immediately. Cancel discards a form; existing sections have no delete button.

Photos use the existing Tina media transport, unique filenames and 24 MiB budget. Remove photo from section removes only its reference, retaining the original file.

## Storage and protection

content/sections.json is a separate singleton with items in display order. It is seeded empty in this release; older front-end builds without that file still render without custom sections. Each section has an automatic ID, title, plain text, optional image/description and visibility. Native Tina defaults and list validation mirror the simple editor.

Saves reread and compare a normalized snapshot of this file; stale or ambiguous saves are rejected with guidance to copy unsaved text and reload. This is optimistic protection, not atomic compare-and-swap. A failed sections load disables section actions while artwork/prices remain usable. Production CI validates Tina's indexed schema before deployment.

## Verification

29 automated tests cover existing content preservation, schema-valid operations, missing/malformed sections isolation, default-hidden creation, ID validation, sorting, stale/duplicate saves, escaped HTML, literal dollar substitution patterns, optional photos and front-end placement/hide/restore. TypeScript and the production Tina build are release checks.

Real Tina local-mode QA completed seven settings mutations, two real local media uploads (verified rendered image dimensions), add/edit/cancel, repeated creation, double-submit suppression, show/hide, order restoration, simulated transport failure/retry and an external local edit followed by rejected stale save. Tests were restored to an empty section list and disposable uploads removed. No test section is published.

Independent review used existing authenticated Claude Code CLI with --safe-mode --model opus --tools "" --no-session-persistence. Both rounds returned modelUsage claude-opus-5-5. Initial issues were fixed (load isolation, native defaults/validation, literal template replacements and upload feedback). Follow-up approved, conditional on including the empty seed and verifying real Tina schema/mutations; both are included and locally exercised.

Hosted authenticated save testing is not claimed for this release: the prior production browser safety rejection is respected and not retried. Production CI and served public/admin artifacts are checked separately. No new permission, invitation, credential or service is required.

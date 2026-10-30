# Price management

The English Start here screen uses the existing Tina authentication and settings save transport.

- My prices > Add price card: enter the card title, service name and price. New cards start hidden. Turn on Show this price card on my website when ready, then Save prices.
- Edit these prices > Add service row: enter Service and Price. Notes are optional. Save prices applies row edits, row visibility and row order together.
- Hide card / Show card and card Up / Down save immediately. Row controls wait for Save prices.
- Cancel discards the current form. Cancel new row only removes an unsaved row. Existing cards and rows are kept; hide them instead.
- Blank title, service name or price is rejected without discarding the draft. Prices and currencies are entered by the artist; no currency is inferred.
- A save failure retains the draft. If another window changed settings, copy unsaved text before reloading. The reread-and-compare guard is optimistic, not an atomic lock.
- Saved means Tina accepted the change. Deployment can take a few minutes; Open website shows the last published version.

## Compatibility and release checks

Optional service-row visibility treats missing/null as visible; legacy content needs no migration. Draft IDs and new-row flags are never saved. Regenerate tina/tina-lock.json with the schema change; production CI validates the cloud schema before deployment.

25 automated tests and TypeScript checks passed. Real Tina local-mode browser QA exercised six settings mutations: append a card, save row changes, show/hide the card, move it up/down. It also checked cancelled/invalid forms, repeated row addition, double-submit suppression, a simulated transport failure with draft retention and successful retry. The local settings file was restored byte-for-byte afterwards. Current artwork updates through dd51e8a were merged; no content or assets are included in this code patch.

Independent review used the installed Claude Code CLI with existing authentication, --safe-mode, --model opus, --tools "", --no-session-persistence. Both returned modelUsage identifier claude-opus-5-5. The initial approve-with-fixes review led to stable row IDs, inline validation, persistent optional price text, note-only compatibility, clearer stale-save guidance and empty-row markup fixes. The follow-up verdict was Approve, with no blocking issues.

Local-mode saves do not prove a hosted authenticated save. A production save test requires an available normal authorized browser session; no user profile, credentials or permission changes are needed for this release.

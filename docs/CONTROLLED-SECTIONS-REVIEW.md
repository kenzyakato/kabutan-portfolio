# Controlled templates and unified section management — local review

Status: implemented and verified locally; not pushed or deployed. Base main: 176d1c1d4dc538e7fc5feefedebad87adcfebb80.

## Artist workflows

- My sections > Add section > Image & text / Artwork showcase / FAQ > fill in content > Apply to preview > Preview page > Save changes. New custom sections start hidden; use Show in preview before saving when ready. The section form previews its content even while hidden.
- Services & prices opens the existing Add price card editor, inside the single Commissions block. It uses the current price data rather than copying it into a second source. Save prices is a separate publishing action. Artwork uses its existing editor too; leaving a staged page warns about losing its draft.
- My sections lists fixed Introduction / Hero, Artwork gallery, Services & prices, Social links, and custom sections. Hide in preview / Show in preview / Up / Down stay staged until Save changes. Hero, fonts, colors and responsive rules are fixed.
- Social links > Edit social links > Add social link > Platform name / HTTPS link / Button text > Show link > Apply social links to preview > Preview page > Save changes. Up / Down reorder links; Hide link / Show link are reversible. Existing four links are unchanged until edited. No Discord invite is invented or server created.
- Version history > Preview version N > review > Save changes restores the version. Cancel changes keeps the saved page. The pre-restore current version is retained, so a restoration can itself be reversed.

## Restore boundary

The last 10 meaningful saved versions capture custom section contents, FAQ entries, artwork selections, and page block order/visibility. Social-only saves do not evict these versions. History is stored beside content in the existing sections.json and saved with one updateSections mutation, not in browser-only memory.

History does NOT restore original artwork files/edits, price data, or social-link settings (including their address, button text, order and visibility). Restoring keeps currently saved social settings. Native/raw Tina or direct Git edits may bypass the studio snapshot writer. Existing artwork/price visibility remains reversible through its dedicated editor; immediate Hide/Show/Move actions now show a clear publishing confirmation. This is not full-site version recovery.

## Data and safety

- items/layout/socials/history have one document source. Existing text/photo items without a kind remain compatible. Default social data is tested against the existing public template. Content/assets/price files were not changed by this patch.
- Artwork showcases reference existing work filenames. Hidden or missing originals are omitted and warned about; missing selections can be cleared. No originals are copied, renamed or deleted.
- Plain text is escaped; URLs allow only complete HTTPS without credentials/control characters. External links use noopener/noreferrer and meaningful labels.
- Limits: 20 custom sections, 20 FAQ entries per section, 20 social links; title120, body12000, answer4000, total custom text120000 characters. Hidden sections count toward capacity.
- New section photo: 8 MiB, 8192 pixels per side, 32 megapixels; header inspection happens before image decoding. Published custom-section photos have a 64 MiB aggregate build budget. The dedicated artwork editor retains its existing 24 MiB per-file policy. These are safety limits, not a total repository/storage quota. Advanced/native selection of oversized media is rejected by the build.
- Uploads retain unique original files, including cancelled uploads. Since the site copies the media library, files may become publicly reachable by their address after another deploy; hiding content is not private file storage.
- Save rereads and compares the full normalized document, including contacts/history. This rejects stale pages, but it is optimistic checking, not an atomic compare-and-swap lock.
- Managed template assembly validates original block boundaries/order and rejects unexpected interleaved markup. Hidden custom sections are omitted; hidden original blocks keep empty safe DOM skeletons. The fixed Hero can still show public art and has a tested lightbox fallback if Gallery is hidden.

## Verification evidence

- TypeScript; 39 automated tests; production-mode local Tina schema/admin build and output/leak guards passed.
- Real Tina local mode (port4003), isolated browser profile: four successful document mutations. Covered all template entry paths, actual media upload/render, staged ordering/visibility, safe social add/edit/order, pre-save preview, double-submit prevention, failed-save retry, cancel, history preview, restore, cancelling restore, reversing a saved restore, and concurrent social edit rejection. Original content and disposable uploads were restored/removed afterwards.
- Actual Claude Code CLI: --safe-mode --model opus --tools "" --no-session-persistence, using existing authentication. Design, implementation and final review all returned modelUsage claude-opus-5-5. Final verdict: Approved for local merge; no remaining blockers. The final Hero/gallery compatibility follow-up was fixed and regression-tested. No new dependencies or permissions.
- No main push, deployment, production test write, invitation, token operation, or retry of the previously blocked production-browser path.

## Release / rollback review

Publishing needs a separate explicit approval. After approval: fetch main, preserve current artist edits, merge only this code/schema change, run current CI and verify Tina indexing before serving admin. Avoid blanket content restores. A rollback must retain the forward-compatible schema/model where possible; FAQ/showcase carry safe text fallback for older renderers. A full older admin cannot edit new structured templates without losing their type-specific fields, so do not present that as a safe editing rollback.

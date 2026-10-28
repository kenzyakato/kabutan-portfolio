# Simple artist editor — local review

Branch: `feature/simple-artist-editor`, based on production `32e3a73`.
Nothing in this change has been pushed, deployed, or used to write to TinaCloud.

## What the artist sees

The website's `/admin/` entry opens **Start here** after the existing Tina sign-in. The project dashboard's **Collaborators** page manages access; it is not the content editor.

- **My artwork** shows image cards instead of a technical file table. Each card has Edit artwork, Hide/Show, Up and Down.
- **Add artwork** asks for one photo, a title, a category from a dropdown and an optional accessible description. It generates a unique filename and display order automatically. New artwork stays hidden until explicitly enabled.
- Replacing a photo automatically clears the previous thumbnail reference. The site uses the new original for its thumbnail, so the artist does not manage two uploads. Original files are kept.
- **My prices** presents the same price cards, including service notes and original price text. The editor changes the card title, services/prices, card note and visibility without a nested file/list workflow.
- **Saving & help** explains the three steps in place. The interface reports unsaved changes, work in progress, confirmed save, and failure. Save confirmation means Tina accepted the write; it never claims the public deployment has finished. The website button opens the last published version, not an unsaved draft.
- The initial developer sidebar placeholder is replaced with a short sign-in explanation and kept closed. Native Tina administration remains available through its existing navigation; no unsupported DOM patching or permission changes are used to remove it.

Category color codes, shadow colors, branch names, internal filenames, manual order values and separate thumbnail fields are absent from the simple workflow. Category creation and layout settings remain owner/advanced tasks.

The site currently has no structured biography or social-link editing fields. This change does not invent an Edit bio action or promise those capabilities. Artwork descriptions are accessibility text, not a new public caption.

## Review the interactive preview

Run `npm run preview:editor`, then open <http://127.0.0.1:4175/>.

The preview uses the real React editor with an in-memory adapter initialized from the 23 existing works and current prices. It has no Tina API client, account login, or remote write path. Refresh resets edits. Its file picker explicitly simulates a sample image; no selected file is uploaded. The real adapter calls Tina's authenticated client and existing repo media transport.

Generated preview files live in ignored `artist-preview/`. The server binds only to loopback and serves preview files and public media, not environment files. Stop it with Ctrl+C.

## Validation and limits

- TypeScript passes.
- 17 tests pass, including automatic hidden drafts/IDs, upload limits, canonical image paths, movement, stale-edit rejection, preserved price notes/currencies, backend-error handling and the existing content/deployment guards.
- A production Tina bundle was built locally with local content and a synthetic noncredential probe. Static output verification passes; no probe is included in public output.
- `content/`, assets, frontend files, schema lock and workflow are unchanged from production: still 23 works, original prices and four social links.
- The installed Node is 22.14.0, below the project's declared 22.15 minimum. Existing npm peer/engine warnings were observed; tests and this build passed. Repeat CI on its supported Node version before release.
- Existing official Chrome headless was used with new isolated temporary profiles on host KenzyaKato. Four real screenshots cover the gallery, add form, price editor and 500-pixel narrow layout. The preview passed 14 browser interaction checks (edit/save/restore, hide/show, movement, add hidden work, one photo picker and price updates) and narrow-layout overflow checks. These are explicitly in-memory demo writes, not hosted save success. Real adapter operations validate against the committed GraphQL schema and use the existing authenticated Tina client. Hosted identity and save-to-deploy end-to-end validation still requires publishing approval.
- The artist invitation was historically Pending. Its current acceptance and the artist's sign-in were not inspected or changed. No invitation was sent and no account permission was broadened.

Before writing, the real adapter rereads the affected document and rejects a changed snapshot. Order moves may require multiple ordinary Tina writes; they are not transactional. On any uncertain/partial failure, the interface asks the user to reload before retrying. Two exactly simultaneous writers remain a platform-level race; no stronger lock is claimed.

## Release gate

User review/confirmation is required before pushing to a branch that deploys or publishing this version. Then run supported-Node CI, check the hosted Start here route with the existing authorized identity, and repeat a reversible save/publish check. If access is still a problem, inspect the existing invitation before considering any new invitation. No new credentials are required by this design.

## Release and rollback steps

1. Obtain explicit approval to merge/push the interface commits to kenzyakato/kabutan-portfolio main, which triggers the existing Pages workflow. No new credentials or access scopes are needed.
2. Fetch latest main and preserve any later artist content changes; integrate only the UI and tests. Run supported-Node checks, then push and monitor the exact main workflow.
3. Verify /admin/ routes to Start here after existing sign-in. With the authorized owner identity, save a reversible punctuation edit, verify the Tina commit and website deployment, restore it, and verify the final content. This creates two production content commits and publishes them, so include it in the approval.
4. If the interface fails, revert only these interface commits on current main and redeploy. Do not reset the repo or revert later content/media commits. Existing artwork and price JSON need no migration.

Review screenshots and browser result JSON are in task-5/artist-review. The preview server runs on KenzyaKato at 127.0.0.1:4175; it is not a cloud-accessible URL.

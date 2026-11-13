# Building the storybook

How to turn a PR or ADR into a storybook page, and how to set up the per-PR preview. `assets/reference-storybook.html` is a complete working example (ADR 0001 from bookmarks-manager). Start from a copy of it.

## Contents
1. Page anatomy: which parts of the reference are generic and which are content
2. Planning the scenes
3. Scene contract
4. References and deep links
5. Facts and numbers
6. Hosting: GitHub Pages with PR previews
7. Checks before pushing

## 1. Page anatomy

The reference page is one self-contained HTML file. It loads only Google Fonts and has no build step.

**Generic; keep as is unless something is broken:**
- CSS "scene machinery": `.scene/.on/.p2`, `.pop`, `.zoom`, `.draw`, `.late`, `.bar`, `.swapA/.swapB`. Elements animate when their scene gets `.on`. Anything marked `.late` or `.swapB` animates in a second phase, when `.p2` is added after `P2[i]` ms. Delays come from the inline `--d` value.
- The player: `go()`, the dots, Replay, Next, Auto-play (off by default), arrow keys, and `prefers-reduced-motion`. Under reduced motion the page jumps straight to each scene's final frame.
- References: `data-ref` and `data-label` on elements, `setPick()`, the `#sN-ref` deep links, the Ask box, and Copy question.
- Layout: the 960×540 SVG stage, then the caption, then the Why and Example cards, then the Ask box.

**Content; replace for each storybook:**
- The `SC` array: `t` (title), `c` (caption), `why` (HTML) and `ex` (HTML), one entry per scene.
- The `<g class="scene">` blocks inside the SVG, plus the scene builders in the script (for example the chart and pipeline builders).
- `DUR` (auto-play time per scene) and `P2` (when each scene's second phase starts, or `null`). Both have one entry per scene.
- The links in the top bar (PR number, companion pages).

## 2. Planning the scenes

Aim for 5–8 scenes. Before drawing anything, write one line per scene: *the claim it makes, and the moment in the animation that proves it.* If you can't name that moment, the scene is text pretending to be a picture. Merge it into another scene's Why card.

A sequence that works for a design decision:
1. **Before and after:** what changes for the user or system.
2. **The options:** the alternatives, then the losers fade and the choice is stamped.
3. **The evidence:** measurements against the requirement, with fixes shown as before and after.
4. **The mechanism:** how the chosen design works, for example a request flowing through a pipeline.
5. **The non-obvious consequence:** the thing reviewers are most likely to miss.
6. **Issues found along the way.**
7. **The decision and the next step.**

For a code PR, replace 2 and 3 with "what the code does differently" and "what could break".

## 3. Scene contract

Every scene has:
- **A title**, worded as a question or a claim ("Is plain SQL fast enough?").
- **A caption**: 1–2 sentences stating the claim.
- **Why** (2–4 sentences): why it matters, plus the reasoning. Follow the reviewer profile: a why at every level.
- **An Example**: one concrete case from the change's own data, ideally before and after, at most about 10 lines of code or data. Code only if the reviewer reads that language.
- **At least one referenceable element**, plus the Why and Example cards, which are always referenceable.
- **One animated "proof moment"**, usually phase 2: the fix applied, the losers fading, a node changing kind.

Drawing rules:
- Keep SVG text at 13px or larger in viewBox units. The stage scales down to about 40% on a phone.
- Draw charts to scale with one scale function. Label units, and mark the requirement line (the budget) clearly.
- Color carries meaning: green means ok or within budget, amber a warning, coral over budget or broken. Always pair color with text.
- Use the same layout per scene type, so scenes are easy to compare.

## 4. References and deep links

- Every meaningful element gets `data-ref="<short-kebab-id>"` and `data-label="<plain description>"`. Put them on the outer `<g>` so a click anywhere in the group selects it.
- IDs are `S<n>.<ref>` (for example `S3.queue`), and deep links are `#s<n>-<ref>`.
- **Keep IDs stable.** When content changes, keep the ID; when you remove an element, retire its ID and don't reuse it. Old questions in the PR thread must still point at the right thing.
- The Copy question output has this format, and the Q&A loop in SKILL.md recognises it:
  ```
  **<Doc ID> · S3.queue** (<label>, in "<scene title>")
  <page url>#s3-queue

  <question>
  ```

## 5. Facts and numbers

- Every number on the page has to trace back to a measurement or a source that's in the repo or linked from it. Keep the script that produced it next to the page, for example a `*-bench/` folder.
- If two numbers come from different runs, say so where they appear.
- Version, license and API claims get checked against upstream (release pages, Dockerfiles, `action.yml`) on the day, and the check date goes in the ADR.
- Label anything not measured as open, and name where it will be settled.

## 6. Hosting: GitHub Pages with PR previews

Put the page under `docs/` (for example `docs/adr/NNNN-story.html`) together with `docs/index.html` and an empty `docs/.nojekyll`.

Copy `assets/workflows/` into `.github/workflows/`:
- `pr-preview.yml` (rossjrw/pr-preview-action): publishes each PR's `docs/` to `gh-pages/pr-preview/pr-<N>/`, comments the link, and removes the folder when the PR closes.
- `pages-deploy.yml` (JamesIves/github-pages-deploy-action): publishes `master`'s `docs/` to the root of `gh-pages`. Two settings matter: `clean-exclude: pr-preview/` keeps previews alive, and `force: false` avoids overwriting them.
- Both share `concurrency: gh-pages`, so they never push at the same time.
- `qr-code: false`. The default QR code sends the preview URL to a third-party service.

Adapt these for the new repo:
- The default branch name, if it isn't `master`.
- The `paths:` filter, if the pages live somewhere other than `docs/`.

One-time setup, done by the repo owner:
- Settings → Pages → Deploy from a branch → `gh-pages` / `(root)`. The branch exists after the first preview run.
- Previews don't work for PRs from forks, whose token is read-only.
- Pushing workflow files needs a token allowed to change workflows. If the push is refused, give the owner the two files to commit.
- The owner's Pages custom domain, if any, redirects the `github.io` links. They still work.

Put the preview links at the top of the PR description, not only in the bot's comment.

Before you recommend any of the actions, verify their current versions from their release pages. Don't trust the versions in the copied files.

## 7. Checks before pushing

Run a quick check in a headless browser (Playwright is preinstalled in cloud sessions):
- Serve `docs/` with `python3 -m http.server` and load every page. There should be no `pageerror` and no broken relative links.
- Open a deep link (`#s3-<ref>`) and confirm the reference box shows that element.
- Click a referenceable element, then use Copy question. The text should match the format in section 4.
- Take a screenshot of each scene's final frame, using `reducedMotion: 'reduce'` to skip animation. Look for overlapping labels and text clipped at the stage edges.

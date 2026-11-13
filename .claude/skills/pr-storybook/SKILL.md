---
name: pr-storybook
description: Turn a pull request, ADR or design change into an animated, clickable HTML "storybook" that reviewers open from a GitHub Pages preview link on the PR. Each scene has a caption, a Why card and an Example card, and every part has an ID (like S3.queue) the reviewer can quote in a question. Also handles the review Q&A loop and updates the reviewer's explanation profile as they ask questions. Use this whenever someone wants a visual, animated or less text-heavy way to review a PR or ADR, asks for an infographic or walkthrough of a change, wants PR previews on GitHub Pages, or sends a message starting with a storybook reference like "**ADR 0001 · S3.queue**", even if they don't say "storybook".
---

# PR storybook

A storybook is one HTML page that explains a change scene by scene. It's served from GitHub Pages with a preview link for each PR, so reviewers can watch it inside their normal review flow. Each scene animates the key idea, then backs it with a **Why** and a concrete **Example**. Reviewers click any part to get a reference ID and ask a question about exactly that part.

The skill has three jobs:
1. **Build** a storybook for a change.
2. **Answer** questions that reference parts of it.
3. **Evolve:** learn from those questions how this reviewer wants things explained, and feed that back into both the storybook and the profile.

Before writing anything a reviewer will read (scene text, cards, answers), read `references/reviewer-profile.md`. It holds the tone and level of detail this reviewer asked for, with evidence. It changes over time, so re-read it each session rather than relying on memory.

## 1. Build a storybook

Read `references/build.md`, then:

1. **Get the substance right first.** Read the PR, ADR or issue and the code it touches.
   - Verify every version, license and API claim against upstream on the day.
   - Measure performance claims rather than estimating them. Commit the benchmark scripts next to the page.
   - The storybook is only as trustworthy as its numbers.
2. **Plan the scenes** (5–8): one line each, naming the claim and the animated moment that proves it. Show the plan to the user if the change is large.
3. **Build from `assets/reference-storybook.html`.** Keep its generic player, reference and Ask machinery, and replace the content (the `SC` array, the SVG scenes, `DUR` and `P2`).
4. **Write the text to the reviewer profile:**
   - A why on every sub-part.
   - Examples taken from the change's own data.
   - Unfamiliar syntax kept off the page.
5. **Host it:** put it under `docs/` and set up the preview workflows from `assets/workflows/`. Section 6 of `build.md` has the setup steps and one-time settings.
6. **Check it in a headless browser** (`build.md` section 7), push, and put the preview links at the top of the PR description.

## 2. Answer a reference question

Questions arrive in this format:

```
**<Doc ID> · S3.queue** (benchmark row: Reading queue, in "Is plain SQL fast enough?")
https://…/0001-story.html#s3-queue

<question>
```

`S3` is the scene, and `queue` is the `data-ref` of the element. `S3.why` and `S3.example` mean the cards. No suffix means the whole scene.

1. Open that scene in the page source: its `SC` entry and the element with that `data-ref`. That way you answer about what the reviewer actually saw, not what you remember writing.
2. If the question is about a number or a cost, get real intermediate figures. Re-run the benchmark and count rows at each step rather than reasoning from memory.
3. Answer using "Answering a question" in the reviewer profile:
   - The mechanism, with a why per step.
   - Numbers tied to the work that produced them, and the cost model.
   - An options table with why each option works and its trade-off.
   - What's measured versus what's open.
   - A recommendation with its why.
4. Finish by offering the concrete change: the ADR, the scene text, the benchmark files. Don't apply it until the reviewer says yes. A "no" means drop it.

## 3. Evolve

After each exchange, ask yourself: did this question show that the storybook, or the way I explain things, was missing something?

- **A gap in one scene** (a missing why, a confusing example): propose the fix to that scene. Keep its reference IDs stable so earlier questions still resolve.
- **A pattern in how the reviewer wants things** (a new kind of question, a correction, a rejected suggestion): add a row to the evidence log in `references/reviewer-profile.md`, with their words and the rule it implies. Update the rules above the log if the new evidence changes them. Tell the user in one line what you added.
- **Something that applies to every storybook** (a better scene pattern, a hosting gotcha): update `build.md` or this file.

Keep rules general. "Always explain Cypher" is too narrow. "Explain unfamiliar syntax in the answer, not on the page" carries over to the next repository.

## Portability

The skill lives in a repo at `.claude/skills/pr-storybook/`. To use it in other repositories, copy the folder to `~/.claude/skills/pr-storybook/` (user level) or publish it in a plugin. When you move it, keep `references/reviewer-profile.md` with it, because that's the part that grows. In a new repo, adapt the default branch name and the `docs/` path in the workflows, and re-check action versions.

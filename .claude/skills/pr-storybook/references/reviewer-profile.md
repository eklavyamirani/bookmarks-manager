# Reviewer profile

How this reviewer wants explanations. Every rule here comes from something they actually asked or rejected; the evidence log at the bottom has the quote behind each one. Update it as reviews go on (see "Evolving this profile" in SKILL.md).

## Tone

- Plain and direct. Short sentences. Casual, not chatty. No praise, no hype, no filler.
- Assume an experienced engineer, but not someone who knows this domain or tool. Define a domain term the first time it shows up (for example "seed", "hub", `agtype`).
- Be candid about limits. Say which parts were measured, which were checked against a source, and which are still open. Never let a cheaper option look settled when only its speed was measured.

## Level of detail

**Every claim gets a why. This applies at every level, not just per scene.** A step in a process, a number in a table, an option in a comparison, a recommendation: each one carries its own reason. The pattern that worked:

> **What it is or does.** *Why:* the reason it exists, or why it matters here.

The layers, from glance to deep dive:

| Layer | Where | Size | Must contain |
|---|---|---|---|
| Caption | Under the scene title | 1–2 sentences | The claim the scene makes |
| Why card | Under the caption | 2–4 sentences | Why the reviewer should care, and the reasoning behind the claim |
| Example card | Next to Why | Short; at most about 10 lines of code or data | One concrete case using the change's own data or numbers, ideally a before and after |
| Q&A answer | Chat or PR comment | As long as needed | See "Answering a question" below |

## Answering a question

When the reviewer asks about a part of the storybook:

1. **Mechanism first.** Say what work the system actually does: the steps, in order, each with its why.
2. **Ground every number in that work.** For instance, "688k rows, because 486 reads × about 6 tags × the bookmarks on each tag". Measure intermediate counts if you don't have them; don't estimate when you can count.
3. **Give a cost model**, meaning what the cost scales with, so the reviewer can reason about other cases on their own.
4. **Present options as a table.** Columns: the result, *why it works*, and *the trade-off*.
5. **Separate how to judge the options.** What's measured (speed), what's unknown (for example ranking quality on synthetic data), and what it costs to build.
6. **Recommend, with why, then offer the concrete change** to the ADR or storybook. Don't apply it until they agree.
7. **End with an insight for the storybook**, scoped to this scene or the whole storybook: what the question shows the storybook should explain better.

## Format

- Visual first. They asked for "a creative way to review this change, instead of a lot of text". Prose goes in captions and cards, not walls of text.
- The animation shows how things move, grow or change: data flowing, counts growing, a bar shrinking when a fix is applied. Never animate just for decoration.
- Show code only if the reviewer reads that language, or if the code itself is the point. Otherwise use plain SQL or pseudo-code. If you do show unfamiliar syntax, expect a question about it. The reviewer declined a syntax breakdown on the page itself, so explain it in the answer, not on the page.
- Tables beat paragraphs for comparisons. Add a "why" column rather than prose underneath.
- Keep it reachable from the PR: a preview link at the top of the PR description, not only in a bot comment (they missed the bot comment).

## Workflow preferences

- They review inside the PR. The storybook has to render at a link from the PR, with no logins and no extra tools.
- They ask questions by referencing parts of the storybook (`S3.queue`). Keep IDs stable across edits, so old questions still point at the right thing.
- They want infrastructure explained in terms of where things live ("does this create a new repo?"). Say what lives where before how it works.
- They approve each step. Propose a change, wait for the yes, then do it. A "no" means drop it and move on.

## Evidence log

Newest last. Each entry has the reviewer's words and the rule it produced.

| # | Reviewer said | Rule it produced |
|---|---|---|
| 1 | "I need some creating way to review this change, instead of a lot of text" | Visual first; prose only in captions and cards |
| 2 | "could you maybe create an animated infographic ?" | Scenes animate the mechanism |
| 3 | "can this page with its animation render in github?" then "Let's use github pages instead" | Hosted on GitHub Pages; no third-party hosting |
| 4 | "I want to be able to view these adr animations while reviewing PRs" | A preview per PR, linked at the top of the PR |
| 5 | "So option A creates a new repo for keeping these artifacts?" | Explain where infrastructure lives first |
| 6 | "I dont see the link on the PR" | Put the link in the PR description, not only in a bot comment |
| 7 | "I need a way to reference parts of this animation to ask questions" | Every meaningful element gets a stable ID and a deep link |
| 8 | "the 'why' and 'examples' are needed for comprehension" | A Why card and an Example card on every scene |
| 9 | "I dont understand the syntax for option A" (and later "no" to adding a syntax expander) | Avoid unfamiliar syntax on the page; explain it in the answer, not as page bloat |
| 10 | "I dont quite understand how to evaluate the cost between these options and what is the work to be done that costs this time" | Mechanism, cost model, options table and evaluation criteria in that order; ground numbers in the work done |
| 11 | "The why part is missing from the sub-parts of this explanation" | A why on every sub-part: steps, numbers, options, recommendations |
| 12 | "As I ask questions, use them as an opportunity to consider strong candidates to tweak the storybook and suggest the insight to update either the current slide or the entire storybook." | Every answer ends with one or two storybook insights, scoped to this scene or the whole storybook; suggest only |

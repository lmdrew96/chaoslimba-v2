# CLAUDE.md — ChaosLimbă v2

## What this is
ChaosLimbă v2 is a Romanian learning app built around one idea: **you learn a language by making mistakes, being corrected, and understanding the correction.** Errors are the curriculum. Everything in the app exists to produce a mistake, catch it, or help the learner grow past it.

This is a fresh rebuild. v1 (`chaos/apps/chaoslimba` and the standalone `ChaosLimba/`) is reference only. **Do not copy v1 features, prompts, or content over unless a patch says to.** v1's CLAUDE.md, timeline doc and "Structured Chaos" guide do not apply here.

**Source of truth:** the "ChaosLimbă v2 — Error Garden Rebuild Spec" doc, https://claude.ai/code/artifact/a81ee08e-7837-4fa5-993b-392b66fcf9e0. When this file and the spec disagree, the spec wins; flag the mismatch to Nae.

## Who you're working with
Nae (she/they): linguistics major (SLA focus), Romanian learner, systems thinker. Coru (claude.ai) brainstorms, specs and files patches; you (Cody) write the code. Nae has ADHD: lead with the result, keep updates short and scannable, recommend one option instead of listing many.

## The architecture in one paragraph
Four parts in a loop. The **tutor** talks with the learner and steers toward one target error. The **learner** answers in Romanian. The **grader** grades that answer and is the **only** thing that writes to the **Error Garden**. The garden holds one plant per error type, and the tutor **reads** it to pick the next target. Intake is the first pass through this same loop, not a separate placement test.

## Hard rules
1. **Only the grader writes to the Error Garden.** The tutor never grades and never writes errors.
2. **No AI-authored curriculum or lessons.** AI converses and diagnoses; it does not generate teaching content.
3. **Fixed error taxonomy.** Every error maps to a named type from the taxonomy. No free-text categories, no heuristic guessing.
4. **Confidence comes from the model, never hardcoded.** Low-confidence grades are shown as "maybe?" and never change plant health.
5. **Precision over recall.** A false correction is worse than a missed error.
6. **Structured output.** Model calls that return data use tool use or structured outputs, not regex-parsed text. No field the model returns may be silently dropped.
7. **The gold test set gates grader changes.** Any change to a grader prompt or model is run against the gold set, and precision/recall are reported in the patch.
8. **No guilt mechanics.** No streaks. Plants go dormant, never die.
9. **Learner audio stays on the device.** Phoneme recognition runs in the browser.

## Models
One constant per role in a single config file. Never inline a model string.

| Role | Model | Constant |
| --- | --- | --- |
| Grader (also grades intake) | Claude Sonnet 5.5 | `GRADER_MODEL` |
| Tutor (also runs intake conversation) | Claude Haiku 5.5 | `TUTOR_MODEL` |
| Phoneme recognition | `facebook/wav2vec2-xlsr-53-espeak-cv-ft`, ONNX q4, transformers.js in the browser | n/a |

Look up exact API model IDs in current Anthropic docs rather than guessing. Do not use Groq/Llama for anything that judges or writes Romanian. Do not add RunPod.

## Stack
- TypeScript, Next.js, Tailwind CSS v4, pnpm. Nae uses WebStorm; don't suggest other editors or languages.
- New projects host on **Cloudflare Workers**, not Vercel.
- Database: Neon Postgres + Drizzle (Neon project `chaoslimba-v2`; local dev uses its `dev` branch via `.env.local`). Schema in `src/db/schema.ts`; `pnpm db:generate` / `pnpm db:migrate`.
- Auth: hand-rolled session auth in `src/lib/auth.ts`, ported from Tangle/Kindling (PBKDF2 via Web Crypto, users in Postgres, sessions in Upstash Redis `chaoslimba-v2`). PBKDF2 needs the Workers Paid plan (~60ms CPU per hash).
- Keep `cacheComponents` off: under workerd it hangs page renders.
- Workers deploy via OpenNext (`@opennextjs/cloudflare`); config in `wrangler.jsonc` and `open-next.config.ts`. Models live in `src/lib/models.ts`.
- Ask before adding dependencies, external services, or anything with a recurring cost.

## Themes
The theme system came over from v1; see `THEMES.md`. The old Lab Notebook theme (`theme-chaos`) is now "ADHDesigns Arcade" and uses the 2026 brand tokens and values.

## Workflow
- Work comes from ChaosPatch, project slug `chaoslimba`. Read the patch notes and spec before starting.
- When a patch is finished, move it to **review**, never straight to done. Nae closes patches after she reviews them.
- Run the build and fix every TypeScript and lint error before committing.
- Before deleting an import, export or field, search the codebase for other uses.
- If a request is ambiguous, ask one question before building rather than guessing.
- Ask Nae before pushing or deploying.

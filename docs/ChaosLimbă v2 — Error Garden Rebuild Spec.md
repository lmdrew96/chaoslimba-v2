# ChaosLimbă v2 — Error Garden Rebuild Spec

Oct 16, 2026 · @Lanae Drew

## Why v2

v2 rebuilds ChaosLimbă around one thesis: you learn a language by making mistakes, being corrected, and understanding the correction. Everything that does not serve that loop goes.

The problem with v1 is trust in the content, not the code. It leans heavily on AI-generated material and tries to back every feature with a different strand of research, so it reads as an amalgamation without a point of view. Nae can't vouch for content she didn't make, and she has no way to tell whether intake or grading is accurate.

The research base narrows to one line Nae believes in: output and corrective feedback (Swain's output hypothesis; Lyster & Ranta on corrective feedback). Errors are the curriculum; AI diagnoses them instead of writing lessons.

## Keep and cut

The test for every part: does it produce a mistake, catch it, or help the learner grow past it?

| Part | Decision | Why |
| --- | --- | --- |
| Color themes | Keep | Nae loves them |
| Chat-based intake | Keep, rebuild | Right format; needs to be trustworthy and feed the garden |
| Error Garden | Keep, make it the heart | The part Nae values most |
| Fossilization targeting in the tutor | Keep | Already steers questions toward recurring errors without surveillance framing |
| Stress minimal-pairs table | Keep | Hand-built, non-AI content (e.g. TORturi / torTUri) |
| Pronunciation grading | Keep, move off RunPod | Pronunciation and stress errors are garden-worthy |
| AI-authored lessons and curriculum | Cut | The source of the content-trust problem |
| Research-for-every-feature layering | Cut | Replaced by the single output-and-correction thesis |

Open: the rest of v1 (Workshop, Mystery Shelf, Deep Fog, generated content) is not decided yet; each gets the same test.

## Intake: the first planting

Intake stops being a placement test with a verdict and becomes day one of the garden. Where you stand and how you improve are the same screen.

Three rules:

1. **Evidence, not a verdict.** Intake shows what it saw ("used the vocative correctly 3/3, mixed up -ul / -le twice"), with the sentences it came from. The learner can check the receipts.
2. **Structured probes inside the chat.** It still feels like conversation, but the tutor deliberately steers toward specific structures (past tense, definite articles, conjunctiv) so it isn't guessing from whatever came up.
3. **Intake is the first planting.** Every Romanian answer in intake goes through the grader, and its findings seed the Error Garden. The garden keeps revising them, so a wrong first guess gets corrected naturally.

The first session runs in one sitting:

1. The intake chat ends. No score screen.
2. The garden appears with its first seeds, each an evidence card.
3. One seed glows: "start here." One, not five.
4. One tap opens a short practice conversation that steers toward that structure. The seed visibly grows or holds.

&#91;embedded content: v2 loop · 4 parts\]

Intake and everyday practice run the same loop; intake is just its first pass.

## The garden: plants, not levels

Each error type is a plant whose health tracks recent accuracy on that structure. Proficiency rises and falls like any living thing, so backsliding is shown without being called failure (Nae's framing).

| State | Meaning | Rule (starting numbers, Oct 18) |
| --- | --- | --- |
| Sprout | Not enough data yet | Fewer than 5 confident attempts ("maybe" grades don't count); health hidden |
| Wilting | Struggling right now | Below 60% over the last 10 confident attempts |
| Growing | Improving | 60 to 84% |
| Thriving | Outgrown for now | 85% or more, with attempts spread over at least 2 sessions |
| Dormant | Not practiced lately | No attempts in 21 days; last state shown faded; never "dead" |

Accuracy = correct uses / (correct uses + errors). The numbers live in one config object so they can be tuned.

Guardrails:

- **Minimum attempts before health counts.** One miss in two tries is noise, not 50% accuracy.
- **Only confident grades move health.** Low-confidence grader calls appear as "maybe?" and never change a plant.
- **No guilt mechanics.** Dormancy replaces death; no streaks.

A "Look how far you came" look-back can read plant history once health is trustworthy.

## Grader

The grader is the only component that writes to the garden, so it is built to be checkable and to prefer silence over a wrong correction.

1. **Fixed error taxonomy.** Every error maps to a named type (article suffix, case ending, agreement, verb conjugation, diacritics, stress, and so on). Each type is a plant species. No free-text categories, no heuristic guessing.
2. **Structured output.** Per error: span, plant id, correction, short explanation, confidence. The grader also reports correct uses of plants already in the learner's garden plus the target seed (obligatory-context analysis), so plants can recover, not only wilt. Returned through tool use or structured outputs, not regex-parsed text. Nothing is dropped between grader and garden.
3. **Real confidence.** The model reports how sure it is. Low-confidence calls show as "maybe?" and don't affect plant health.
4. **Precision over recall.** A false correction teaches a wrong rule and wilts a plant unfairly; missing an error costs much less.
5. **Gold test set.** 50 to 100 items. v0: correct sentences cited from a published grammar, deliberately broken and labeled by Nae; a native-speaker check upgrades it to v1 later. No AI checks the labels. Run it on every prompt or model change; report precision and recall. This is the answer to "no way to tell."
6. **Rules where rules work.** Deterministic checks for morphology a parser can handle; the LLM for the rest. (Stanza's Romanian support is unverified.)

Beautiful Mistakes stay: the grader flags rare errors that show creativity, and they reach the learner.

## Error taxonomy

22 plants in 6 beds, approved by Nae on Oct 18, 2026. Every error the grader reports maps to exactly one plant id. A learner only sees plants for mistakes they have made. Examples still need a native-speaker check.

| Bed | Plant | id | Example error → fix |
| --- | --- | --- | --- |
| Nouns & articles | Definite article suffix | `definite-article` | câinul → câinele |
| Nouns & articles | Indefinite article & gender | `indefinite-article-gender` | o proiect → un proiect |
| Nouns & articles | Plural forms | `plural-forms` | trene → trenuri |
| Nouns & articles | Genitive-dative case | `genitive-dative` | cartea lui Maria → cartea Mariei |
| Nouns & articles | Possessive article (al/a/ai/ale) | `possessive-article` | un prieten a meu → un prieten al meu |
| Agreement | Adjective agreement | `adjective-agreement` | o casă frumos → o casă frumoasă |
| Agreement | Subject-verb agreement | `subject-verb-agreement` | ei merge → ei merg |
| Verbs | Present conjugation | `present-conjugation` | lucreză → lucrează |
| Verbs | Perfect compus | `perfect-compus` | am mergut → am mers |
| Verbs | Conjunctiv after să | `conjunctiv` | el vrea să merge → el vrea să meargă |
| Verbs | Future & conditional | `future-conditional` | aș vreau → aș vrea |
| Verbs | Reflexive verbs | `reflexive-verbs` | eu numesc → mă numesc |
| Pronouns | Clitic pronouns | `clitic-pronouns` | văd el → îl văd |
| Pronouns | Pe with person objects | `pe-person-object` | îl văd Ion → îl văd pe Ion |
| Sentence building | Prepositions | `prepositions` | mă gândesc despre tine → mă gândesc la tine |
| Sentence building | Negative concord | `negative-concord` | nu am văzut pe cineva → nu am văzut pe nimeni |
| Sentence building | Word choice / calques | `word-choice` | sunt 25 ani vechi → am 25 de ani |
| Sentence building | Word order | `word-order` | catch-all for placement errors |
| Spelling & sound | Diacritics | `diacritics` | fara → fără |
| Spelling & sound | Spelling (î/â, -ii) | `spelling` | copii vs copiii |
| Spelling & sound | Stress | `stress` | TORturi (cakes) vs torTUri (tortures) |
| Spelling & sound | Sounds (ă, î, ș, ț) | `sounds` | from the phoneme model |

Correct-but-unnatural phrasing (la un proiect vs într-un proiect) is not a plant. The grader returns it as a separate polish note that never touches the garden.

## Tutor

The tutor is a conversation partner, not a curriculum author or a second grader. It reads the garden and never writes to it.

1. **Steer toward the glowing seed.** Create natural chances to use the target structure. Keep v1's fossilization targeting and its no-surveillance phrasing.
2. **Elicit before recasting.** Prompt self-correction first ("hm, *the* book?"); model the right form only if that fails. Lyster & Ranta found prompts lead to more learner repair than recasts.
3. **Don't correct everything live.** Correct the target seed and anything that blocks meaning. Everything else is logged quietly by the grader.
4. **Separate roles.** Grading is removed from the tutor prompt entirely. A friendly tutor can't soften grades, and a strict grader can't make conversation feel like a test.

Intake uses this same tutor with structured probes; its Romanian goes through the grader like any other turn.

## Pronunciation

Phoneme grading moves from a RunPod GPU endpoint (not currently running) to the learner's browser, using the same model. No server, no per-call cost, and audio never leaves the device.

- **Model:** `facebook/wav2vec2-xlsr-53-espeak-cv-ft`, ONNX export at [qnighy/wav2vec2-xlsr-53-espeak-cv-ft-ONNX](https://huggingface.co/qnighy/wav2vec2-xlsr-53-espeak-cv-ft-ONNX), run with transformers.js.
- **File:** `onnx/model_q4.onnx`, 230 MB, downloaded once and cached. Set `dtype` explicitly: the transformers.js default (q8) scored far worse on non-English audio in the model card.
- **Decoding:** the model's tokenizer isn't implemented in transformers.js, so CTC decoding is a small hand-written vocab lookup (model card explains).
- **Accuracy:** q4 differed from fp32 by about 3 to 5% of phonemes on the card's two test clips. That's an illustration, not a benchmark; the pronunciation gold set confirms it.
- **Tradeoff:** a 230 MB first load, and possibly slow on older phones.

Reference phonemes: v1 makes the target via Google TTS and runs it through the model, so learners are compared against a machine voice. Idea to explore: generate the reference straight from text with espeak-ng, which supports Romanian and matches the model's training labels. Whether a usable browser or npm build exists is unverified.

Pronunciation gold set: 20 to 30 clips of human Romanian speakers, used to check scores and to replace the arbitrary 0.70 pass threshold. Until then, pronunciation seeds count as "maybe."

The stress minimal-pairs table stays as it is. Whisper transcription also moves into the browser (decided Oct 18), so no learner audio goes to Groq.

## Models

Sonnet 5.5 for anything that judges Romanian, Haiku 5.5 for conversation. Groq/Llama comes out of every role, speech-to-text included. This follows Nae's October decision to run kept apps on Haiku / Sonnet 5.5.

| Role | Model | Config constant |
| --- | --- | --- |
| Grader (writes to the garden) | Sonnet 5.5 | `GRADER_MODEL` |
| Tutor | Haiku 5.5 | `TUTOR_MODEL` |
| Intake conversation | Haiku 5.5 (the tutor) | `TUTOR_MODEL` |
| Intake grading | Sonnet 5.5 (the grader) | `GRADER_MODEL` |
| Phoneme recognition | wav2vec2 xlsr-53 espeak, in browser | n/a |
| Speech-to-text | Whisper (large-v3-turbo to start), in browser | n/a |

One constant per role, so a swap is one line tested against the gold set. Once the gold set exists, run Haiku as the grader; if its precision is close to Sonnet's, switch.

This replaces v1's deleted "Centralize model strings" patch.

## What v1's code shows

Read from `chaos/apps/chaoslimba` on Oct 16, 2026. The engine idea is sound; the wiring between parts is what fails.

| Area | Finding | File |
| --- | --- | --- |
| Intake | Never grammar-checks the learner's Romanian; the model just declares a level | `src/app/api/onboarding/tutor/route.ts` |
| Intake | Never seeds the Error Garden; seeding only runs for the deprecated writing/speaking tests | `src/app/api/onboarding/complete/route.ts` |
| Intake | Saves only the level label; reasoning is discarded | `src/app/api/onboarding/complete/route.ts` |
| Grader | Confidence is hardcoded by category (0.95 / 0.90 / 0.60), not from the model; garden severity derives from it | `src/lib/ai/grammar.ts` |
| Grader | Explanations are dropped before reaching the garden | `src/lib/ai/grammar.ts` |
| Grader | Beautiful Mistakes are parsed but left out of the return, so they never surface | `src/lib/grammarChecker.ts` |
| Grader | Free-text categories plus a fallback guesser with shaky rules | `src/lib/ai/grammar.ts` |
| Grader | 700-token cap risks cut-off JSON on longer answers | `src/lib/grammarChecker.ts` |
| Tutor | Also grades, on Groq with its own error types; chaos-window logs its errors at a fixed 0.7 | `src/lib/ai/tutor.ts` |
| Tutor | Response template includes a sample score (0.85) the model can copy | `src/lib/ai/tutor.ts` |
| Pronunciation | RunPod endpoint not running; reference built from Google TTS; fixed 0.70 threshold | `runpod/wav2vec2-phoneme/` |
| Docs | CLAUDE.md is stale (open-source-first, Llama tutor, $0 to 5 budget, "MVP 99.5%") and would steer Cody against this plan | `CLAUDE.md` |

Not checked: which Groq model the tutor uses (it lives in the shared `ai-clients` package).

## Open questions and first steps

The gold test set comes first: every other fix is judged against it.

First steps, in order:

- [x] Write the v2 CLAUDE.md (done Oct 17, in chaoslimba-v2; work is filed as v2 patches in ChaosPatch)
- [x] Define the fixed error taxonomy (the plant species) (approved Oct 18; encoded in v0.3.0)
- [ ] Build the grammar gold set (50 to 100 sentences; v0 from a cited reference grammar, a native-speaker check makes it v1)
- [ ] Rebuild the grader: structured output, real confidence, Sonnet 5.5
- [ ] Wire intake through the grader and seed the garden with evidence cards
- [ ] Remove grading from the tutor; move it to Haiku 5.5
- [ ] Move phoneme recognition into the browser

Open questions:

- Which native speaker verifies the gold sets
- What happens to Workshop, Mystery Shelf, Deep Fog, and generated content
- Whether a browser build of espeak-ng is usable for reference phonemes
- Whether v2 needs an HTTP MCP server (a v1 patch, deleted Oct 16; the local server failed Neon auth)

// The grader: the only component that judges learner Romanian and the only
// writer to the Error Garden. Precision over recall: a false correction is
// worse than a missed error.

import Anthropic from "@anthropic-ai/sdk";
import { GRADER_EFFORT, GRADER_MODEL } from "@/lib/models";
import {
  PLANTS,
  PLANT_IDS,
  isPlantId,
  type CorrectUse,
  type GradedError,
  type PlantId,
  type PolishNote,
} from "@/lib/taxonomy";

/**
 * Below this model-reported confidence a finding shows as "maybe?" and never
 * moves plant health. Tune against the gold set.
 */
export const MAYBE_THRESHOLD = 0.8;

/** Stress and sounds come from the phoneme model; text can't show them. */
const AUDIO_ONLY_PLANTS: readonly PlantId[] = ["stress", "sounds"];
const TEXT_PLANT_IDS = PLANT_IDS.filter((id) => !AUDIO_ONLY_PLANTS.includes(id));

export type GradeInput = {
  answer: string;
  /** The turn the learner was answering, for meaning. Never graded itself. */
  context?: string;
  /** Plants already in this learner's garden (they've made errors on them). */
  gardenPlantIds: readonly PlantId[];
  /** The seed the tutor is steering toward, if any. */
  targetPlantId?: PlantId;
};

export type GradeResult = {
  errors: (GradedError & { isMaybe: boolean })[];
  correctUses: (CorrectUse & { isMaybe: boolean })[];
  polishNotes: PolishNote[];
  /** The model's JSON exactly as returned, stored alongside the parsed findings. */
  raw: unknown;
};

/** The model declined or ran out of room; nothing was graded and nothing should be stored. */
export class GraderIncompleteError extends Error {
  constructor(readonly reason: "refusal" | "max_tokens" | "no_output", message: string) {
    super(message);
    this.name = "GraderIncompleteError";
  }
}

/** The model's JSON didn't hold up to validation the schema can't express. */
export class GraderOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraderOutputError";
  }
}

let client: Anthropic | undefined;

const getClient = (): Anthropic => {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  client = new Anthropic({ apiKey });
  return client;
};

const taxonomyText = PLANTS.filter((p) => !AUDIO_ONLY_PLANTS.includes(p.id))
  .map((p) => {
    const example = p.example ? ` Example: "${p.example.error}" → "${p.example.fix}".` : "";
    return `- ${p.id} (${p.name}): ${p.description}${example}`;
  })
  .join("\n");

// Stable across requests so it can be cached. Anything per-request goes in the user message.
const SYSTEM_PROMPT = `You grade short Romanian answers written by an English-speaking learner. Your findings feed the learner's Error Garden, where each error type is a plant whose health tracks their accuracy. A false correction teaches a wrong rule and wilts a plant unfairly; a missed error costs much less. When in doubt, stay silent.

Grade only the learner's answer. The context, when given, is the turn they were answering; use it to understand what they meant, and never grade it.

## Error types
Every error maps to exactly one of these ids. If a mistake fits none of them, leave it out.
${taxonomyText}

## Rules
- Report an error only when the form is wrong in standard Romanian. Accepted variants, informal register and correct-but-unusual choices are not errors.
- Correct but unnatural phrasing goes in polish_notes, never in errors.
- Word order: Romanian order depends on syntax, meaning and pragmatics (topic, focus, emphasis). Flag word-order only when the order is ungrammatical or changes the meaning the learner intended. A marked but valid order is not an error; at most it is a polish note.
- One finding per mistake. "span" is copied exactly from the learner's answer, and as short as it can be while still showing the mistake.
- "correction" is the corrected form of the span. "explanation" is one or two plain sentences to the learner, in English, saying what the rule is. Don't lecture.
- "confidence" is your honest probability, from 0 to 1, that this really is an error AND that the error type is right. Use low values when you're unsure: a possible typo, a regional form, an ambiguous intended meaning.
- "beautiful_mistake" is true only for a rare error that shows a creative, rule-based guess, such as applying a real Romanian pattern where it happens not to fit. Most errors are not beautiful mistakes.
- correct_uses: for each listed plant only, report every place the learner used that structure correctly, where the structure was required. Same span and confidence rules.

## Output
Return only the JSON the schema describes.`;

const outputSchema = (correctUsePlants: readonly PlantId[]): Record<string, unknown> => {
  const errorItem = {
    type: "object",
    properties: {
      span: { type: "string" },
      plant_id: { type: "string", enum: TEXT_PLANT_IDS },
      correction: { type: "string" },
      explanation: { type: "string" },
      confidence: { type: "number" },
      beautiful_mistake: { type: "boolean" },
    },
    required: ["span", "plant_id", "correction", "explanation", "confidence", "beautiful_mistake"],
    additionalProperties: false,
  };
  const polishItem = {
    type: "object",
    properties: {
      span: { type: "string" },
      suggestion: { type: "string" },
      explanation: { type: "string" },
    },
    required: ["span", "suggestion", "explanation"],
    additionalProperties: false,
  };
  const properties: Record<string, unknown> = {
    errors: { type: "array", items: errorItem },
    polish_notes: { type: "array", items: polishItem },
  };
  // An empty enum isn't a valid schema, so with no plants to check the field is left out entirely.
  if (correctUsePlants.length > 0) {
    properties.correct_uses = {
      type: "array",
      items: {
        type: "object",
        properties: {
          span: { type: "string" },
          plant_id: { type: "string", enum: correctUsePlants },
          confidence: { type: "number" },
        },
        required: ["span", "plant_id", "confidence"],
        additionalProperties: false,
      },
    };
  }
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
};

const userMessage = (input: GradeInput, correctUsePlants: readonly PlantId[]): string => {
  const parts: string[] = [];
  if (input.context?.trim()) parts.push(`<context>\n${input.context.trim()}\n</context>`);
  parts.push(`<answer>\n${input.answer.trim()}\n</answer>`);
  parts.push(
    correctUsePlants.length > 0
      ? `Plants to check for correct uses: ${correctUsePlants.join(", ")}.`
      : "No plants to check for correct uses.",
  );
  return parts.join("\n\n");
};

const checkConfidence = (value: unknown, where: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new GraderOutputError(`${where}: confidence must be a number from 0 to 1, got ${String(value)}`);
  }
  return value;
};

const checkPlant = (value: unknown, allowed: readonly PlantId[], where: string): PlantId => {
  if (typeof value !== "string" || !isPlantId(value) || !allowed.includes(value)) {
    throw new GraderOutputError(`${where}: unexpected plant id ${String(value)}`);
  }
  return value;
};

const checkText = (value: unknown, where: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new GraderOutputError(`${where}: expected non-empty text`);
  }
  return value;
};

type RawItem = Record<string, unknown>;

const parseOutput = (raw: unknown, correctUsePlants: readonly PlantId[]): GradeResult => {
  if (typeof raw !== "object" || raw === null) throw new GraderOutputError("output is not an object");
  const out = raw as Record<string, unknown>;
  const list = (key: string): RawItem[] => {
    const value = out[key];
    if (value === undefined && key === "correct_uses" && correctUsePlants.length === 0) return [];
    if (!Array.isArray(value)) throw new GraderOutputError(`${key} is not an array`);
    return value as RawItem[];
  };

  const errors = list("errors").map((e, i) => {
    const where = `errors[${i}]`;
    const confidence = checkConfidence(e.confidence, where);
    return {
      plantId: checkPlant(e.plant_id, TEXT_PLANT_IDS, where),
      span: checkText(e.span, where),
      correction: checkText(e.correction, where),
      explanation: checkText(e.explanation, where),
      confidence,
      beautifulMistake: e.beautiful_mistake === true,
      isMaybe: confidence < MAYBE_THRESHOLD,
    };
  });

  const correctUses = list("correct_uses").map((c, i) => {
    const where = `correct_uses[${i}]`;
    const confidence = checkConfidence(c.confidence, where);
    return {
      plantId: checkPlant(c.plant_id, correctUsePlants, where),
      span: checkText(c.span, where),
      confidence,
      isMaybe: confidence < MAYBE_THRESHOLD,
    };
  });

  const polishNotes = list("polish_notes").map((p, i) => {
    const where = `polish_notes[${i}]`;
    return {
      span: checkText(p.span, where),
      suggestion: checkText(p.suggestion, where),
      explanation: checkText(p.explanation, where),
    };
  });

  return { errors, correctUses, polishNotes, raw };
};

export const gradeAnswer = async (input: GradeInput): Promise<GradeResult> => {
  const correctUsePlants = [
    ...new Set([...input.gardenPlantIds, ...(input.targetPlantId ? [input.targetPlantId] : [])]),
  ].filter((id) => TEXT_PLANT_IDS.includes(id));

  const response = await getClient().messages.create({
    model: GRADER_MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage(input, correctUsePlants) }],
    output_config: {
      effort: GRADER_EFFORT,
      format: { type: "json_schema", schema: outputSchema(correctUsePlants) },
    },
  });

  if (response.stop_reason === "refusal") {
    const category = response.stop_details?.category ?? "unknown";
    throw new GraderIncompleteError("refusal", `The grader declined this answer (category: ${category}).`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new GraderIncompleteError("max_tokens", "The grader ran out of room before finishing.");
  }

  // Thinking blocks may come first; the JSON is in the text block.
  const text = response.content.find((b) => b.type === "text");
  if (!text) throw new GraderIncompleteError("no_output", "The grader returned no output.");

  let raw: unknown;
  try {
    raw = JSON.parse(text.text);
  } catch {
    throw new GraderOutputError("output is not valid JSON");
  }
  return parseOutput(raw, correctUsePlants);
};

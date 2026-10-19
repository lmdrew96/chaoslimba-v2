// The fixed error taxonomy: 22 plants in 6 beds, approved by Nae on 2026-10-18.
// Plant ids are the contract between grader, garden and tutor. Every error the
// grader reports maps to exactly one plant id; there are no free-text categories.

export type BedId =
  | "nouns-articles"
  | "agreement"
  | "verbs"
  | "pronouns"
  | "sentence-building"
  | "spelling-sound";

export const BEDS: readonly { id: BedId; name: string }[] = [
  { id: "nouns-articles", name: "Nouns & articles" },
  { id: "agreement", name: "Agreement" },
  { id: "verbs", name: "Verbs" },
  { id: "pronouns", name: "Pronouns" },
  { id: "sentence-building", name: "Sentence building" },
  { id: "spelling-sound", name: "Spelling & sound" },
];

type PlantExample = {
  error: string;
  fix: string;
  /** Context the error/fix pair needs to make sense. */
  note?: string;
  /** False until a native speaker has checked it. */
  verified: boolean;
};

type PlantDefinition = {
  id: string;
  name: string;
  bed: BedId;
  description: string;
  /** Null where the spec gives no single example (word order, phoneme-model output). */
  example: PlantExample | null;
};

export const PLANTS = [
  // Nouns & articles
  {
    id: "definite-article",
    name: "Definite article suffix",
    bed: "nouns-articles",
    description: "The enclitic definite article (-ul, -le, -a, -i, -le) attached to the noun.",
    example: { error: "câinul", fix: "câinele", verified: false },
  },
  {
    id: "indefinite-article-gender",
    name: "Indefinite article & gender",
    bed: "nouns-articles",
    description: "Choosing un/o/niște to match the noun's gender.",
    example: { error: "o proiect", fix: "un proiect", verified: false },
  },
  {
    id: "plural-forms",
    name: "Plural forms",
    bed: "nouns-articles",
    description: "Picking the right plural ending for a noun.",
    example: { error: "trene", fix: "trenuri", verified: false },
  },
  {
    id: "genitive-dative",
    name: "Genitive-dative case",
    bed: "nouns-articles",
    description: "Genitive-dative endings and when to use lui vs an inflected form.",
    example: { error: "cartea lui Maria", fix: "cartea Mariei", verified: false },
  },
  {
    id: "possessive-article",
    name: "Possessive article (al/a/ai/ale)",
    bed: "nouns-articles",
    description: "The possessive article agreeing with the possessed noun.",
    example: { error: "un prieten a meu", fix: "un prieten al meu", verified: false },
  },

  // Agreement
  {
    id: "adjective-agreement",
    name: "Adjective agreement",
    bed: "agreement",
    description: "Adjectives matching their noun in gender, number and case.",
    example: { error: "o casă frumos", fix: "o casă frumoasă", verified: false },
  },
  {
    id: "subject-verb-agreement",
    name: "Subject-verb agreement",
    bed: "agreement",
    description: "The verb matching its subject in person and number.",
    example: { error: "ei merge", fix: "ei merg", verified: false },
  },

  // Verbs
  {
    id: "present-conjugation",
    name: "Present conjugation",
    bed: "verbs",
    description: "Present-tense verb forms, including stem changes.",
    example: { error: "lucreză", fix: "lucrează", verified: false },
  },
  {
    id: "perfect-compus",
    name: "Perfect compus",
    bed: "verbs",
    description: "The compound past: auxiliary plus the right past participle.",
    example: { error: "am mergut", fix: "am mers", verified: false },
  },
  {
    id: "conjunctiv",
    name: "Conjunctiv after să",
    bed: "verbs",
    description: "Subjunctive verb forms after să.",
    example: { error: "el vrea să merge", fix: "el vrea să meargă", verified: false },
  },
  {
    id: "future-conditional",
    name: "Future & conditional",
    bed: "verbs",
    description: "Future and conditional constructions and their verb forms.",
    example: { error: "aș vreau", fix: "aș vrea", verified: false },
  },
  {
    id: "reflexive-verbs",
    name: "Reflexive verbs",
    bed: "verbs",
    description: "Using the reflexive pronoun with verbs that need one.",
    example: { error: "eu numesc", fix: "mă numesc", verified: false },
  },

  // Pronouns
  {
    id: "clitic-pronouns",
    name: "Clitic pronouns",
    bed: "pronouns",
    description: "Short object pronoun forms and where they go.",
    example: { error: "văd el", fix: "îl văd", verified: false },
  },
  {
    id: "pe-person-object",
    name: "Pe with person objects",
    bed: "pronouns",
    description: "Marking a direct object that is a person with pe.",
    example: { error: "îl văd Ion", fix: "îl văd pe Ion", verified: false },
  },

  // Sentence building
  {
    id: "prepositions",
    name: "Prepositions",
    bed: "sentence-building",
    description: "Choosing the preposition a verb or phrase takes.",
    example: { error: "mă gândesc despre tine", fix: "mă gândesc la tine", verified: false },
  },
  {
    id: "negative-concord",
    name: "Negative concord",
    bed: "sentence-building",
    description: "Using negative words (nimeni, nimic, niciodată) together with nu.",
    example: { error: "nu am văzut pe cineva", fix: "nu am văzut pe nimeni", verified: false },
  },
  {
    id: "word-choice",
    name: "Word choice / calques",
    bed: "sentence-building",
    description: "Wrong word or a phrase translated word-for-word from another language.",
    example: { error: "sunt 25 ani vechi", fix: "am 25 de ani", verified: false },
  },
  {
    id: "word-order",
    name: "Word order",
    bed: "sentence-building",
    description: "Ordering words and phrases, which depends on syntax, meaning and pragmatics (topic, focus, emphasis).",
    example: null,
  },

  // Spelling & sound
  {
    id: "diacritics",
    name: "Diacritics",
    bed: "spelling-sound",
    description: "Missing or wrong ă, â, î, ș, ț.",
    example: { error: "fara", fix: "fără", verified: false },
  },
  {
    id: "spelling",
    name: "Spelling (î/â, -ii)",
    bed: "spelling-sound",
    description: "Spelling rules such as î vs â and -i / -ii / -iii endings.",
    example: { error: "copii", fix: "copiii", note: "copii = children, copiii = the children", verified: false },
  },
  {
    id: "stress",
    name: "Stress",
    bed: "spelling-sound",
    description: "Stressing the wrong syllable, which can change the meaning.",
    example: { error: "torTUri", fix: "TORturi", note: "TORturi = cakes, torTUri = tortures", verified: false },
  },
  {
    id: "sounds",
    name: "Sounds (ă, î, ș, ț)",
    bed: "spelling-sound",
    description: "Pronouncing Romanian-specific sounds; reported by the phoneme model.",
    example: null,
  },
] as const satisfies readonly PlantDefinition[];

export type Plant = (typeof PLANTS)[number];
export type PlantId = Plant["id"];

const PLANT_IDS: ReadonlySet<string> = new Set(PLANTS.map((plant) => plant.id));

/** Checks model output at runtime; an unknown id must be rejected, never guessed. */
export const isPlantId = (value: string): value is PlantId => PLANT_IDS.has(value);

export const getPlant = (id: PlantId): Plant => {
  const plant = PLANTS.find((p) => p.id === id);
  if (!plant) throw new Error(`Unknown plant id: ${id}`);
  return plant;
};

// Grader output shapes. The grader patch builds the calls; these types pin
// every reported error and correct use to a plant id.

/** Model-reported, 0 to 1. Never hardcoded. */
export type Confidence = number;

/** A mistake on one plant. Low confidence shows as "maybe?" and never moves plant health. */
export type GradedError = {
  plantId: PlantId;
  span: string;
  correction: string;
  explanation: string;
  confidence: Confidence;
  /** A rare error that shows creativity; surfaced to the learner. */
  beautifulMistake: boolean;
};

/** A correct use of a plant already in the garden or the target seed (obligatory context). */
export type CorrectUse = {
  plantId: PlantId;
  span: string;
  confidence: Confidence;
};

/** Correct-but-unnatural phrasing. Shown to the learner, never mapped to a plant or stored in the garden. */
export type PolishNote = {
  span: string;
  suggestion: string;
  explanation: string;
};

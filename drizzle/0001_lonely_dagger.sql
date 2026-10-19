CREATE TYPE "public"."finding_kind" AS ENUM('error', 'correct_use', 'polish');--> statement-breakpoint
CREATE TYPE "public"."plant_id" AS ENUM('definite-article', 'indefinite-article-gender', 'plural-forms', 'genitive-dative', 'possessive-article', 'adjective-agreement', 'subject-verb-agreement', 'present-conjugation', 'perfect-compus', 'conjunctiv', 'future-conditional', 'reflexive-verbs', 'clitic-pronouns', 'pe-person-object', 'prepositions', 'negative-concord', 'word-choice', 'word-order', 'diacritics', 'spelling', 'stress', 'sounds');--> statement-breakpoint
CREATE TABLE "grade_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grading_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "finding_kind" NOT NULL,
	"plant_id" "plant_id",
	"span" text NOT NULL,
	"correction" text,
	"suggestion" text,
	"explanation" text,
	"confidence" real,
	"is_maybe" boolean DEFAULT false NOT NULL,
	"beautiful_mistake" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gradings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"answer" text NOT NULL,
	"context" text,
	"target_plant_id" "plant_id",
	"model" text NOT NULL,
	"effort" text NOT NULL,
	"raw_output" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grade_findings" ADD CONSTRAINT "grade_findings_grading_id_gradings_id_fk" FOREIGN KEY ("grading_id") REFERENCES "public"."gradings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_findings" ADD CONSTRAINT "grade_findings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grade_findings_user_plant_idx" ON "grade_findings" USING btree ("user_id","plant_id");
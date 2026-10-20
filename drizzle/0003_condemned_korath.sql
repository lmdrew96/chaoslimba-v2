CREATE TYPE "public"."conversation_kind" AS ENUM('practice', 'intake');--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "kind" "conversation_kind" DEFAULT 'practice' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "completed_at" timestamp with time zone;
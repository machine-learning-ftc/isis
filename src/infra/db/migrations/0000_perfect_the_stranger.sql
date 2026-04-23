CREATE TABLE "fact_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"claim" text NOT NULL,
	"verdict" varchar(16) NOT NULL,
	"confidence" double precision NOT NULL,
	"source" varchar(16) NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confidence_range" CHECK ("fact_checks"."confidence" >= 0 AND "fact_checks"."confidence" <= 1)
);
--> statement-breakpoint
CREATE INDEX "idx_fact_checks_created_at" ON "fact_checks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_fact_checks_query" ON "fact_checks" USING btree ("query");
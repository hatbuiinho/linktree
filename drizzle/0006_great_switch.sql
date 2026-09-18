ALTER TABLE "blocks" ADD COLUMN "share_code" text;--> statement-breakpoint
UPDATE "blocks" SET "share_code" = upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)) WHERE "share_code" IS NULL;--> statement-breakpoint
ALTER TABLE "blocks" ALTER COLUMN "share_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_share_code_unique" ON "blocks" USING btree ("share_code");

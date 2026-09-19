CREATE INDEX "blocks_public_page_position_idx" ON "blocks" USING btree ("page_id","position") WHERE "enabled" = true;--> statement-breakpoint
CREATE INDEX "click_events_page_block_idx" ON "click_events" USING btree ("page_id","block_id");

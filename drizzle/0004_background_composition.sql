ALTER TABLE "themes" ADD COLUMN "background_mobile_value" text;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "background_focal_x" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "background_focal_y" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "background_overlay_color" text DEFAULT '#0f172a' NOT NULL;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "background_overlay_opacity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "themes"
SET
	"background_focal_x" = CASE "background_position"
		WHEN 'left top' THEN 0
		WHEN 'left center' THEN 0
		WHEN 'left bottom' THEN 0
		WHEN 'right top' THEN 100
		WHEN 'right center' THEN 100
		WHEN 'right bottom' THEN 100
		ELSE 50
	END,
	"background_focal_y" = CASE "background_position"
		WHEN 'left top' THEN 0
		WHEN 'center top' THEN 0
		WHEN 'right top' THEN 0
		WHEN 'left bottom' THEN 100
		WHEN 'center bottom' THEN 100
		WHEN 'right bottom' THEN 100
		ELSE 50
	END
WHERE "background_position" <> 'center';

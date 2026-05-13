CREATE TABLE "class_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"teacher" text,
	"day_of_week" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"classroom" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_schedule_day_of_week_check" CHECK ("day_of_week" IN ('Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado')),
	CONSTRAINT "class_schedule_time_check" CHECK ("start_time" < "end_time")
);
--> statement-breakpoint
CREATE INDEX "class_schedule_day_time_idx" ON "class_schedule" USING btree ("day_of_week","start_time");

CREATE TABLE "teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teachers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"teacher_id" integer,
	"classroom" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"day_of_week" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_schedules_day_of_week_check" CHECK ("day_of_week" IN ('Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado')),
	CONSTRAINT "class_schedules_time_check" CHECK ("start_time" < "end_time")
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" text,
	"due_date" date,
	"grade" text,
	"max_grade" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "teachers" ("name")
SELECT DISTINCT btrim("teacher")
FROM "class_schedule"
WHERE "teacher" IS NOT NULL AND btrim("teacher") <> '';
--> statement-breakpoint
INSERT INTO "classes" ("subject", "teacher_id", "classroom", "notes", "created_at", "updated_at")
SELECT
	cs."subject",
	max(t."id"),
	cs."classroom",
	cs."notes",
	min(cs."created_at"),
	max(cs."updated_at")
FROM "class_schedule" cs
LEFT JOIN "teachers" t ON lower(t."name") = lower(btrim(cs."teacher"))
GROUP BY cs."subject", lower(coalesce(btrim(cs."teacher"), '')), cs."classroom", cs."notes";
--> statement-breakpoint
INSERT INTO "class_schedules" ("class_id", "day_of_week", "start_time", "end_time", "created_at", "updated_at")
SELECT
	c."id",
	cs."day_of_week",
	cs."start_time",
	cs."end_time",
	cs."created_at",
	cs."updated_at"
FROM "class_schedule" cs
LEFT JOIN "teachers" t ON lower(t."name") = lower(btrim(cs."teacher"))
INNER JOIN "classes" c ON c."subject" = cs."subject"
	AND c."teacher_id" IS NOT DISTINCT FROM t."id"
	AND c."classroom" IS NOT DISTINCT FROM cs."classroom"
	AND c."notes" IS NOT DISTINCT FROM cs."notes";
--> statement-breakpoint
INSERT INTO "evaluations" ("class_id", "title", "grade", "notes", "created_at", "updated_at")
SELECT
	c."id",
	'Evaluacion general',
	cs."grade",
	cs."evaluations",
	cs."created_at",
	cs."updated_at"
FROM "class_schedule" cs
LEFT JOIN "teachers" t ON lower(t."name") = lower(btrim(cs."teacher"))
INNER JOIN "classes" c ON c."subject" = cs."subject"
	AND c."teacher_id" IS NOT DISTINCT FROM t."id"
	AND c."classroom" IS NOT DISTINCT FROM cs."classroom"
	AND c."notes" IS NOT DISTINCT FROM cs."notes"
WHERE cs."grade" IS NOT NULL OR cs."evaluations" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");
--> statement-breakpoint
CREATE INDEX "class_schedules_class_idx" ON "class_schedules" USING btree ("class_id");
--> statement-breakpoint
CREATE INDEX "class_schedules_day_time_idx" ON "class_schedules" USING btree ("day_of_week", "start_time");
--> statement-breakpoint
CREATE INDEX "evaluations_class_idx" ON "evaluations" USING btree ("class_id");
--> statement-breakpoint
CREATE INDEX "evaluations_due_date_idx" ON "evaluations" USING btree ("due_date");
--> statement-breakpoint
DROP TABLE "class_schedule";

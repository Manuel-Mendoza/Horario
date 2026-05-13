import { sql } from 'drizzle-orm'
import { check, date, index, integer, pgTable, serial, text, time, timestamp, unique } from 'drizzle-orm/pg-core'

export const teachers = pgTable(
  'teachers',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [unique('teachers_name_unique').on(table.name)]
)

export const classes = pgTable(
  'classes',
  {
    id: serial('id').primaryKey(),
    subject: text('subject').notNull(),
    teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
    classroom: text('classroom'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('classes_teacher_idx').on(table.teacherId)]
)

export const classSchedules = pgTable(
  'class_schedules',
  {
    id: serial('id').primaryKey(),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    dayOfWeek: text('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      'class_schedules_day_of_week_check',
      sql`${table.dayOfWeek} IN ('Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado')`
    ),
    check('class_schedules_time_check', sql`${table.startTime} < ${table.endTime}`),
    index('class_schedules_class_idx').on(table.classId),
    index('class_schedules_day_time_idx').on(table.dayOfWeek, table.startTime)
  ]
)

export const evaluations = pgTable(
  'evaluations',
  {
    id: serial('id').primaryKey(),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: text('type'),
    dueDate: date('due_date'),
    grade: text('grade'),
    maxGrade: text('max_grade'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('evaluations_class_idx').on(table.classId), index('evaluations_due_date_idx').on(table.dueDate)]
)

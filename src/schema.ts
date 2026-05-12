import { sql } from 'drizzle-orm'
import { check, index, pgTable, serial, text, time, timestamp } from 'drizzle-orm/pg-core'

export const classSchedule = pgTable(
  'class_schedule',
  {
    id: serial('id').primaryKey(),
    subject: text('subject').notNull(),
    teacher: text('teacher'),
    dayOfWeek: text('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    classroom: text('classroom'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      'class_schedule_day_of_week_check',
      sql`${table.dayOfWeek} IN ('Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado')`
    ),
    check('class_schedule_time_check', sql`${table.startTime} < ${table.endTime}`),
    index('class_schedule_day_time_idx').on(table.dayOfWeek, table.startTime)
  ]
)

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { sql } from './db.js'

type ClassPayload = {
  subject?: unknown
  teacherId?: unknown
  teacher?: unknown
  dayOfWeek?: unknown
  startTime?: unknown
  endTime?: unknown
  classroom?: unknown
  notes?: unknown
}

type TeacherPayload = {
  name?: unknown
  email?: unknown
  phone?: unknown
  notes?: unknown
}

type SchedulePayload = {
  dayOfWeek?: unknown
  startTime?: unknown
  endTime?: unknown
}

type EvaluationPayload = {
  title?: unknown
  type?: unknown
  dueDate?: unknown
  grade?: unknown
  maxGrade?: unknown
  notes?: unknown
}

const app = new Hono()

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
const timeZone = process.env.TIME_ZONE ?? 'America/Caracas'
const weekDayByEnglishName: Record<string, string> = {
  Sunday: 'Domingo',
  Monday: 'Lunes',
  Tuesday: 'Martes',
  Wednesday: 'Miercoles',
  Thursday: 'Jueves',
  Friday: 'Viernes',
  Saturday: 'Sabado'
}

const time12hRegex = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const formatTime12h = (value: unknown) => {
  if (typeof value !== 'string') return value

  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = minuteText.slice(0, 2)
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12

  return `${hour12.toString().padStart(2, '0')}:${minute} ${period}`
}

const parseTime12h = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !time12hRegex.test(value.trim())) {
    throw new HTTPException(400, { message: `${field} must use hh:mm AM/PM format` })
  }

  const [, hourText, period] = value.trim().match(time12hRegex) ?? []
  const minute = value.trim().split(':')[1].slice(0, 2)
  let hour = Number(hourText)

  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12

  return `${hour.toString().padStart(2, '0')}:${minute}`
}

const optionalText = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new HTTPException(400, { message: `${field} must be text` })
  return value.trim()
}

const requiredText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HTTPException(400, { message: `${field} is required` })
  }

  return value.trim()
}

const optionalId = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === '') return null
  const id = Number(value)

  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(400, { message: `${field} must be a positive integer` })
  }

  return id
}

const optionalDate = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !dateRegex.test(value.trim())) {
    throw new HTTPException(400, { message: `${field} must use YYYY-MM-DD format` })
  }

  return value.trim()
}

const requiredDay = (value: unknown) => {
  if (typeof value !== 'string') {
    throw new HTTPException(400, { message: 'dayOfWeek must be a valid day name' })
  }

  const normalized = value.trim().toLowerCase()
  const day = dayNames.find((dayName) => dayName.toLowerCase() === normalized)

  if (!day) {
    throw new HTTPException(400, { message: `dayOfWeek must be one of: ${dayNames.join(', ')}` })
  }

  return day
}

const requiredTime = (value: unknown, field: string) => parseTime12h(value, field)

const getScheduleDate = (offsetDays = 0) => {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(now)
  const year = dateParts.find((part) => part.type === 'year')?.value
  const month = dateParts.find((part) => part.type === 'month')?.value
  const day = dateParts.find((part) => part.type === 'day')?.value
  const dayOfWeek = weekDayByEnglishName[weekday]

  if (!year || !month || !day || !dayOfWeek) {
    throw new HTTPException(500, { message: 'could not resolve current date' })
  }

  return {
    date: `${year}-${month}-${day}`,
    dayOfWeek
  }
}

const toTeacherResponse = (row: Record<string, unknown> | null) => {
  if (!row?.teacher_id) return null

  return {
    id: row.teacher_id,
    name: row.teacher_name,
    email: row.teacher_email,
    phone: row.teacher_phone,
    notes: row.teacher_notes
  }
}

const toScheduleResponse = (row: Record<string, unknown>) => ({
  id: row.id,
  classId: row.class_id,
  dayOfWeek: row.day_of_week,
  startTime: formatTime12h(row.start_time),
  endTime: formatTime12h(row.end_time),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const toEvaluationResponse = (row: Record<string, unknown>) => ({
  id: row.id,
  classId: row.class_id,
  title: row.title,
  type: row.type,
  dueDate: row.due_date,
  grade: row.grade,
  maxGrade: row.max_grade,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const getClassRow = async (id: unknown) => {
  const [row] = await sql`
    SELECT c.*, t.id AS teacher_id, t.name AS teacher_name, t.email AS teacher_email, t.phone AS teacher_phone, t.notes AS teacher_notes
    FROM classes c
    LEFT JOIN teachers t ON t.id = c.teacher_id
    WHERE c.id = ${id}
  `

  return row
}

const getClassResponse = async (id: unknown) => {
  const row = await getClassRow(id)

  if (!row) throw new HTTPException(404, { message: 'class not found' })

  const schedules = await sql`
    SELECT *
    FROM class_schedules
    WHERE class_id = ${id}
    ORDER BY array_position(ARRAY['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'], day_of_week), start_time
  `
  const evaluations = await sql`
    SELECT *
    FROM evaluations
    WHERE class_id = ${id}
    ORDER BY due_date NULLS LAST, id
  `

  return {
    id: row.id,
    subject: row.subject,
    teacher: toTeacherResponse(row),
    classroom: row.classroom,
    notes: row.notes,
    schedules: schedules.map(toScheduleResponse),
    evaluations: evaluations.map(toEvaluationResponse),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const resolveTeacherId = async (body: Pick<ClassPayload, 'teacherId' | 'teacher'>, currentTeacherId: unknown = null) => {
  if (body.teacherId !== undefined) {
    const teacherId = optionalId(body.teacherId, 'teacherId')
    if (teacherId === null) return null

    const [teacher] = await sql`SELECT id FROM teachers WHERE id = ${teacherId}`
    if (!teacher) throw new HTTPException(400, { message: 'teacherId does not exist' })

    return teacherId
  }

  if (body.teacher !== undefined) {
    const teacherName = optionalText(body.teacher, 'teacher')
    if (teacherName === null) return null

    const [teacher] = await sql`SELECT id FROM teachers WHERE lower(name) = lower(${teacherName}) LIMIT 1`
    if (teacher) return teacher.id

    const [newTeacher] = await sql`INSERT INTO teachers (name) VALUES (${teacherName}) RETURNING id`
    return newTeacher.id
  }

  return currentTeacherId
}

app.get('/health', (c) => c.json({ ok: true }))

app.get('/teachers', async (c) => {
  const rows = await sql`SELECT * FROM teachers ORDER BY name`
  return c.json(rows)
})

app.post('/teachers', async (c) => {
  const body = await c.req.json<TeacherPayload>()
  const name = requiredText(body.name, 'name')
  const email = optionalText(body.email, 'email')
  const phone = optionalText(body.phone, 'phone')
  const notes = optionalText(body.notes, 'notes')

  const [row] = await sql`
    INSERT INTO teachers (name, email, phone, notes)
    VALUES (${name}, ${email}, ${phone}, ${notes})
    RETURNING *
  `

  return c.json(row, 201)
})

app.patch('/teachers/:id', async (c) => {
  const body = await c.req.json<TeacherPayload>()
  const [current] = await sql`SELECT * FROM teachers WHERE id = ${c.req.param('id')}`

  if (!current) throw new HTTPException(404, { message: 'teacher not found' })

  const name = body.name === undefined ? current.name : requiredText(body.name, 'name')
  const email = body.email === undefined ? current.email : optionalText(body.email, 'email')
  const phone = body.phone === undefined ? current.phone : optionalText(body.phone, 'phone')
  const notes = body.notes === undefined ? current.notes : optionalText(body.notes, 'notes')

  const [row] = await sql`
    UPDATE teachers
    SET name = ${name}, email = ${email}, phone = ${phone}, notes = ${notes}, updated_at = now()
    WHERE id = ${c.req.param('id')}
    RETURNING *
  `

  return c.json(row)
})

app.get('/classes', async (c) => {
  const rows = await sql`
    SELECT c.id
    FROM classes c
    LEFT JOIN class_schedules s ON s.class_id = c.id
    GROUP BY c.id
    ORDER BY min(array_position(ARRAY['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'], s.day_of_week)), min(s.start_time), c.subject
  `

  return c.json(await Promise.all(rows.map((row) => getClassResponse(row.id))))
})

app.get('/classes/today', async (c) => {
  const today = getScheduleDate()
  const rows = await sql`
    SELECT DISTINCT c.id
    FROM classes c
    INNER JOIN class_schedules s ON s.class_id = c.id
    WHERE s.day_of_week = ${today.dayOfWeek}
    ORDER BY c.id
  `

  return c.json({
    date: today.date,
    dayOfWeek: today.dayOfWeek,
    timeZone,
    classes: await Promise.all(rows.map((row) => getClassResponse(row.id)))
  })
})

app.get('/classes/tomorrow', async (c) => {
  const tomorrow = getScheduleDate(1)
  const rows = await sql`
    SELECT DISTINCT c.id
    FROM classes c
    INNER JOIN class_schedules s ON s.class_id = c.id
    WHERE s.day_of_week = ${tomorrow.dayOfWeek}
    ORDER BY c.id
  `

  return c.json({
    date: tomorrow.date,
    dayOfWeek: tomorrow.dayOfWeek,
    timeZone,
    classes: await Promise.all(rows.map((row) => getClassResponse(row.id)))
  })
})

app.get('/classes/:id', async (c) => c.json(await getClassResponse(c.req.param('id'))))

app.post('/classes', async (c) => {
  const body = await c.req.json<ClassPayload>()
  const subject = requiredText(body.subject, 'subject')
  const teacherId = await resolveTeacherId(body)
  const classroom = optionalText(body.classroom, 'classroom')
  const notes = optionalText(body.notes, 'notes')

  const [row] = await sql`
    INSERT INTO classes (subject, teacher_id, classroom, notes)
    VALUES (${subject}, ${teacherId}, ${classroom}, ${notes})
    RETURNING *
  `

  if (body.dayOfWeek !== undefined || body.startTime !== undefined || body.endTime !== undefined) {
    const dayOfWeek = requiredDay(body.dayOfWeek)
    const startTime = requiredTime(body.startTime, 'startTime')
    const endTime = requiredTime(body.endTime, 'endTime')

    await sql`
      INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time)
      VALUES (${row.id}, ${dayOfWeek}, ${startTime}, ${endTime})
    `
  }

  return c.json(await getClassResponse(row.id), 201)
})

app.patch('/classes/:id', async (c) => {
  const body = await c.req.json<ClassPayload>()
  const current = await getClassRow(c.req.param('id'))

  if (!current) throw new HTTPException(404, { message: 'class not found' })

  const subject = body.subject === undefined ? current.subject : requiredText(body.subject, 'subject')
  const teacherId = await resolveTeacherId(body, current.teacher_id)
  const classroom = body.classroom === undefined ? current.classroom : optionalText(body.classroom, 'classroom')
  const notes = body.notes === undefined ? current.notes : optionalText(body.notes, 'notes')

  const [row] = await sql`
    UPDATE classes
    SET subject = ${subject}, teacher_id = ${teacherId}, classroom = ${classroom}, notes = ${notes}, updated_at = now()
    WHERE id = ${c.req.param('id')}
    RETURNING id
  `

  return c.json(await getClassResponse(row.id))
})

app.delete('/classes/:id', async (c) => {
  const rows = await sql`
    DELETE FROM classes
    WHERE id = ${c.req.param('id')}
    RETURNING id
  `

  if (!rows[0]) throw new HTTPException(404, { message: 'class not found' })

  return c.body(null, 204)
})

app.post('/classes/:id/schedules', async (c) => {
  const body = await c.req.json<SchedulePayload>()
  const classRow = await getClassRow(c.req.param('id'))

  if (!classRow) throw new HTTPException(404, { message: 'class not found' })

  const dayOfWeek = requiredDay(body.dayOfWeek)
  const startTime = requiredTime(body.startTime, 'startTime')
  const endTime = requiredTime(body.endTime, 'endTime')
  const [row] = await sql`
    INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time)
    VALUES (${c.req.param('id')}, ${dayOfWeek}, ${startTime}, ${endTime})
    RETURNING *
  `

  return c.json(toScheduleResponse(row), 201)
})

app.patch('/schedules/:id', async (c) => {
  const body = await c.req.json<SchedulePayload>()
  const [current] = await sql`SELECT * FROM class_schedules WHERE id = ${c.req.param('id')}`

  if (!current) throw new HTTPException(404, { message: 'schedule not found' })

  const dayOfWeek = body.dayOfWeek === undefined ? current.day_of_week : requiredDay(body.dayOfWeek)
  const startTime = body.startTime === undefined ? current.start_time : requiredTime(body.startTime, 'startTime')
  const endTime = body.endTime === undefined ? current.end_time : requiredTime(body.endTime, 'endTime')
  const [row] = await sql`
    UPDATE class_schedules
    SET day_of_week = ${dayOfWeek}, start_time = ${startTime}, end_time = ${endTime}, updated_at = now()
    WHERE id = ${c.req.param('id')}
    RETURNING *
  `

  return c.json(toScheduleResponse(row))
})

app.delete('/schedules/:id', async (c) => {
  const rows = await sql`DELETE FROM class_schedules WHERE id = ${c.req.param('id')} RETURNING id`

  if (!rows[0]) throw new HTTPException(404, { message: 'schedule not found' })

  return c.body(null, 204)
})

app.post('/classes/:id/evaluations', async (c) => {
  const body = await c.req.json<EvaluationPayload>()
  const classRow = await getClassRow(c.req.param('id'))

  if (!classRow) throw new HTTPException(404, { message: 'class not found' })

  const title = requiredText(body.title, 'title')
  const type = optionalText(body.type, 'type')
  const dueDate = optionalDate(body.dueDate, 'dueDate')
  const grade = optionalText(body.grade, 'grade')
  const maxGrade = optionalText(body.maxGrade, 'maxGrade')
  const notes = optionalText(body.notes, 'notes')
  const [row] = await sql`
    INSERT INTO evaluations (class_id, title, type, due_date, grade, max_grade, notes)
    VALUES (${c.req.param('id')}, ${title}, ${type}, ${dueDate}, ${grade}, ${maxGrade}, ${notes})
    RETURNING *
  `

  return c.json(toEvaluationResponse(row), 201)
})

app.patch('/evaluations/:id', async (c) => {
  const body = await c.req.json<EvaluationPayload>()
  const [current] = await sql`SELECT * FROM evaluations WHERE id = ${c.req.param('id')}`

  if (!current) throw new HTTPException(404, { message: 'evaluation not found' })

  const title = body.title === undefined ? current.title : requiredText(body.title, 'title')
  const type = body.type === undefined ? current.type : optionalText(body.type, 'type')
  const dueDate = body.dueDate === undefined ? current.due_date : optionalDate(body.dueDate, 'dueDate')
  const grade = body.grade === undefined ? current.grade : optionalText(body.grade, 'grade')
  const maxGrade = body.maxGrade === undefined ? current.max_grade : optionalText(body.maxGrade, 'maxGrade')
  const notes = body.notes === undefined ? current.notes : optionalText(body.notes, 'notes')
  const [row] = await sql`
    UPDATE evaluations
    SET title = ${title}, type = ${type}, due_date = ${dueDate}, grade = ${grade}, max_grade = ${maxGrade}, notes = ${notes}, updated_at = now()
    WHERE id = ${c.req.param('id')}
    RETURNING *
  `

  return c.json(toEvaluationResponse(row))
})

app.delete('/evaluations/:id', async (c) => {
  const rows = await sql`DELETE FROM evaluations WHERE id = ${c.req.param('id')} RETURNING id`

  if (!rows[0]) throw new HTTPException(404, { message: 'evaluation not found' })

  return c.body(null, 204)
})

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status)
  }

  console.error(error)
  return c.json({ error: 'internal server error' }, 500)
})

const port = Number(process.env.PORT ?? 3000)

serve({
  fetch: app.fetch,
  port
})

console.log(`API running on http://localhost:${port}`)

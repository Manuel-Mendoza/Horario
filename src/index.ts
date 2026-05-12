import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { sql } from './db.js'

type ClassPayload = {
  subject?: unknown
  teacher?: unknown
  dayOfWeek?: unknown
  startTime?: unknown
  endTime?: unknown
  classroom?: unknown
  notes?: unknown
}

const app = new Hono()

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

const toClassResponse = (row: Record<string, unknown>) => ({
  id: row.id,
  subject: row.subject,
  teacher: row.teacher,
  dayOfWeek: row.day_of_week,
  startTime: formatTime12h(row.start_time),
  endTime: formatTime12h(row.end_time),
  classroom: row.classroom,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const time12hRegex = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i

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

const requiredTime = (value: unknown, field: string) => {
  return parseTime12h(value, field)
}

app.get('/health', (c) => c.json({ ok: true }))

app.get('/classes', async (c) => {
  const rows = await sql`
    SELECT *
    FROM class_schedule
    ORDER BY array_position(ARRAY['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'], day_of_week), start_time
  `

  return c.json(rows.map(toClassResponse))
})

app.get('/classes/:id', async (c) => {
  const [row] = await sql`
    SELECT *
    FROM class_schedule
    WHERE id = ${c.req.param('id')}
  `

  if (!row) throw new HTTPException(404, { message: 'class not found' })

  return c.json(toClassResponse(row))
})

app.post('/classes', async (c) => {
  const body = await c.req.json<ClassPayload>()
  const subject = requiredText(body.subject, 'subject')
  const teacher = optionalText(body.teacher, 'teacher')
  const dayOfWeek = requiredDay(body.dayOfWeek)
  const startTime = requiredTime(body.startTime, 'startTime')
  const endTime = requiredTime(body.endTime, 'endTime')
  const classroom = optionalText(body.classroom, 'classroom')
  const notes = optionalText(body.notes, 'notes')

  const [row] = await sql`
    INSERT INTO class_schedule (subject, teacher, day_of_week, start_time, end_time, classroom, notes)
    VALUES (${subject}, ${teacher}, ${dayOfWeek}, ${startTime}, ${endTime}, ${classroom}, ${notes})
    RETURNING *
  `

  return c.json(toClassResponse(row), 201)
})

app.patch('/classes/:id', async (c) => {
  const body = await c.req.json<ClassPayload>()
  const current = await sql`
    SELECT *
    FROM class_schedule
    WHERE id = ${c.req.param('id')}
  `

  if (!current[0]) throw new HTTPException(404, { message: 'class not found' })

  const subject = body.subject === undefined ? current[0].subject : requiredText(body.subject, 'subject')
  const teacher = body.teacher === undefined ? current[0].teacher : optionalText(body.teacher, 'teacher')
  const dayOfWeek = body.dayOfWeek === undefined ? current[0].day_of_week : requiredDay(body.dayOfWeek)
  const startTime = body.startTime === undefined ? current[0].start_time : requiredTime(body.startTime, 'startTime')
  const endTime = body.endTime === undefined ? current[0].end_time : requiredTime(body.endTime, 'endTime')
  const classroom = body.classroom === undefined ? current[0].classroom : optionalText(body.classroom, 'classroom')
  const notes = body.notes === undefined ? current[0].notes : optionalText(body.notes, 'notes')

  const [row] = await sql`
    UPDATE class_schedule
    SET subject = ${subject},
        teacher = ${teacher},
        day_of_week = ${dayOfWeek},
        start_time = ${startTime},
        end_time = ${endTime},
        classroom = ${classroom},
        notes = ${notes},
        updated_at = now()
    WHERE id = ${c.req.param('id')}
    RETURNING *
  `

  return c.json(toClassResponse(row))
})

app.delete('/classes/:id', async (c) => {
  const rows = await sql`
    DELETE FROM class_schedule
    WHERE id = ${c.req.param('id')}
    RETURNING id
  `

  if (!rows[0]) throw new HTTPException(404, { message: 'class not found' })

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

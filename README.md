# Horario API

Backend sencillo con Hono y Neon/PostgreSQL para guardar un horario de clases.

## Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env` a partir de `.env.example` y pega tu connection string de Neon:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/dbname?sslmode=require"
PORT=3000
TIME_ZONE=America/Caracas
```

3. Crea o sincroniza la tabla en Neon:

```bash
npm run db:push
```

4. Levanta el servidor:

```bash
npm run dev
```

## Base De Datos

- `npm run db:generate`: genera migraciones desde `src/schema.ts`.
- `npm run db:migrate`: ejecuta migraciones pendientes en Neon.
- `npm run db:push`: sincroniza el schema directamente con Neon.
- `npm run db:studio`: abre Drizzle Studio para explorar la base de datos.

Para desarrollo rapido puedes usar `db:push`. Para cambios versionados usa `db:generate` y luego `db:migrate`.

### Esquema

El modelo esta separado para evitar repetir informacion:

#### `teachers`

Guarda profesores reutilizables.

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | `serial` | Si | Identificador del profesor. |
| `name` | `text` | Si | Nombre del profesor. |
| `email` | `text` | No | Correo del profesor. |
| `phone` | `text` | No | Telefono del profesor. |
| `notes` | `text` | No | Notas del profesor. |
| `created_at` | `timestamp with time zone` | Si | Fecha de creacion. |
| `updated_at` | `timestamp with time zone` | Si | Fecha de ultima actualizacion. |

#### `classes`

Guarda la materia o clase base. Puede apuntar a un profesor existente con `teacher_id`.

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | `serial` | Si | Identificador de la clase. |
| `subject` | `text` | Si | Nombre de la materia o clase. |
| `teacher_id` | `integer` | No | Profesor asignado desde `teachers.id`. |
| `classroom` | `text` | No | Aula, salon o ubicacion. |
| `notes` | `text` | No | Notas adicionales. |
| `created_at` | `timestamp with time zone` | Si | Fecha de creacion. |
| `updated_at` | `timestamp with time zone` | Si | Fecha de ultima actualizacion. |

#### `class_schedules`

Guarda horarios. Una clase puede tener varios horarios.

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | `serial` | Si | Identificador del horario. |
| `class_id` | `integer` | Si | Clase asociada desde `classes.id`. |
| `day_of_week` | `text` | Si | Dia de la semana. |
| `start_time` | `time` | Si | Hora de inicio. |
| `end_time` | `time` | Si | Hora de cierre. |
| `created_at` | `timestamp with time zone` | Si | Fecha de creacion. |
| `updated_at` | `timestamp with time zone` | Si | Fecha de ultima actualizacion. |

#### `evaluations`

Guarda evaluaciones de cada clase. Una clase puede tener muchas evaluaciones.

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | `serial` | Si | Identificador de la evaluacion. |
| `class_id` | `integer` | Si | Clase asociada desde `classes.id`. |
| `title` | `text` | Si | Nombre de la evaluacion. |
| `type` | `text` | No | Tipo, por ejemplo parcial, tarea o exposicion. |
| `due_date` | `date` | No | Fecha de entrega o presentacion. |
| `grade` | `text` | No | Nota obtenida. |
| `max_grade` | `text` | No | Nota maxima. |
| `notes` | `text` | No | Detalles adicionales. |
| `created_at` | `timestamp with time zone` | Si | Fecha de creacion. |
| `updated_at` | `timestamp with time zone` | Si | Fecha de ultima actualizacion. |

`day_of_week` acepta: `Domingo`, `Lunes`, `Martes`, `Miercoles`, `Jueves`, `Viernes` o `Sabado`.

`start_time` debe ser menor que `end_time`.

## Endpoints

- `GET /health`
- `GET /teachers`
- `POST /teachers`
- `PATCH /teachers/:id`
- `GET /classes`
- `GET /classes/today`
- `GET /classes/tomorrow`
- `GET /classes/:id`
- `POST /classes`
- `PATCH /classes/:id`
- `DELETE /classes/:id`
- `POST /classes/:id/schedules`
- `PATCH /schedules/:id`
- `DELETE /schedules/:id`
- `POST /evaluations`
- `POST /classes/:id/evaluations`
- `PATCH /evaluations/:id`
- `DELETE /evaluations/:id`

## Ejemplos

Para consultar las clases de hoy segun la fecha actual en Caracas:

```bash
curl http://localhost:3000/classes/today
```

Para consultar las clases de mañana:

```bash
curl http://localhost:3000/classes/tomorrow
```

Respuesta:

```json
{
  "date": "2026-05-12",
  "dayOfWeek": "Martes",
  "timeZone": "America/Caracas",
  "classes": []
}
```

`dayOfWeek` usa el nombre del dia: `Domingo`, `Lunes`, `Martes`, `Miercoles`, `Jueves`, `Viernes` o `Sabado`.

`startTime` y `endTime` usan formato 12h con AM/PM, por ejemplo `08:00 AM` o `01:30 PM`.

### POST `/teachers` - Crear Profesor

Inserta una fila en `teachers`.

```bash
curl -X POST http://localhost:3000/teachers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Profe Garcia",
    "email": "garcia@example.com",
    "phone": "+58 412-0000000",
    "notes": "Disponible despues de clases"
  }'
```

### Crear Clase

Inserta una fila en `classes`. Tambien puede crear o reutilizar el profesor si envias `teacher`.

```bash
curl -X POST http://localhost:3000/classes \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Matematicas",
    "teacher": "Profe Garcia",
    "dayOfWeek": "Lunes",
    "startTime": "08:00 AM",
    "endTime": "09:30 AM",
    "classroom": "A-101",
    "notes": "Traer calculadora"
  }'
```

Si el profesor ya existe, tambien puedes usar `teacherId` en lugar de `teacher`.

```bash
curl -X POST http://localhost:3000/classes \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Fisica",
    "teacherId": 1,
    "classroom": "B-204",
    "notes": "Laboratorio los viernes"
  }'
```

### Crear Horario

Inserta una fila en `class_schedules` para una clase existente.

```bash
curl -X POST http://localhost:3000/classes/1/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": "Miercoles",
    "startTime": "08:00 AM",
    "endTime": "09:30 AM"
  }'
```

### Crear Evaluacion Por Materia

Inserta una fila en `evaluations` buscando la clase por `subject`.

```bash
curl -X POST http://localhost:3000/evaluations \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Hardware",
    "title": "Infografia",
    "type": "Exposicion",
    "dueDate": "2026-05-14",
    "maxGrade": "20",
    "notes": "Tema: Deteccion de fallas y problemas del hardware y software"
  }'
```

Si hay varias clases con el mismo `subject`, la API responde `409` para evitar guardar la evaluacion en la clase equivocada.

### Crear Evaluacion Por ID

Inserta una fila en `evaluations` para una clase existente usando `classes.id`.

```bash
curl -X POST http://localhost:3000/classes/1/evaluations \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Parcial 1",
    "type": "Parcial",
    "dueDate": "2026-05-22",
    "grade": "18",
    "maxGrade": "20",
    "notes": "Tema: derivadas"
  }'
```

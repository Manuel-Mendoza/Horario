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

## Endpoints

- `GET /health`
- `GET /classes`
- `GET /classes/:id`
- `POST /classes`
- `PATCH /classes/:id`
- `DELETE /classes/:id`

## Ejemplo

`dayOfWeek` usa el nombre del dia: `Domingo`, `Lunes`, `Martes`, `Miercoles`, `Jueves`, `Viernes` o `Sabado`.

`startTime` y `endTime` usan formato 12h con AM/PM, por ejemplo `08:00 AM` o `01:30 PM`.

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

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

3. Ejecuta `db/schema.sql` en Neon SQL Editor para crear la tabla.

4. Levanta el servidor:

```bash
npm run dev
```

## Endpoints

- `GET /health`
- `GET /classes`
- `GET /classes/:id`
- `POST /classes`
- `PATCH /classes/:id`
- `DELETE /classes/:id`

## Ejemplo

`dayOfWeek` usa `0` para domingo, `1` lunes, hasta `6` sabado.

```bash
curl -X POST http://localhost:3000/classes \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Matematicas",
    "teacher": "Profe Garcia",
    "dayOfWeek": 1,
    "startTime": "08:00",
    "endTime": "09:30",
    "classroom": "A-101",
    "notes": "Traer calculadora"
  }'
```

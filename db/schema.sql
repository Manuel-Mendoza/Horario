CREATE TABLE IF NOT EXISTS class_schedule (
  id serial PRIMARY KEY,
  subject text NOT NULL,
  teacher text,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  classroom text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS class_schedule_day_time_idx
  ON class_schedule (day_of_week, start_time);

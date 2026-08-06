ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS due_time time without time zone;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time time without time zone;
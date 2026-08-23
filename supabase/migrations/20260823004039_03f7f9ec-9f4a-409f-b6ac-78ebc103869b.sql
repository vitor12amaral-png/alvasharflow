ALTER TABLE public.client_packages ADD COLUMN IF NOT EXISTS price_per_video numeric;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS price_per_video numeric;
UPDATE public.client_packages
SET price_per_video = ROUND(price::numeric / NULLIF(total_videos, 0), 2)
WHERE price_per_video IS NULL AND total_videos > 0 AND price > 0;
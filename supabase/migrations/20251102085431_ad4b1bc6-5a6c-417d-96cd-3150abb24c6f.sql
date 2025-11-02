-- Add task_name column to tasks table if it doesn't exist
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_name TEXT;
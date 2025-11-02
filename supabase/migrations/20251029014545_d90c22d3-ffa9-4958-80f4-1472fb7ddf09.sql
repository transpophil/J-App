-- Update tasks table to ensure all status values are supported
-- Add a check constraint that allows: available, accepted, on_board, completed

-- First, drop the existing check constraint if it exists
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new check constraint with all supported statuses
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('available', 'accepted', 'on_board', 'completed'));

-- Create an index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Create an index on driver_id for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_driver_id ON public.tasks(driver_id);

-- Update any existing tasks with old statuses to the new format
UPDATE public.tasks 
SET status = 'completed' 
WHERE status = 'done';

UPDATE public.tasks 
SET status = 'on_board' 
WHERE status = 'in_progress' OR status = 'in_transit';

-- Enable realtime for tasks table so notifications work properly
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
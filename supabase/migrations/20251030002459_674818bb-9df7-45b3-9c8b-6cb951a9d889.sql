-- Add DELETE policy for tasks table to enable task deletion in Admin Panel
CREATE POLICY "Anyone can delete tasks"
ON public.tasks
FOR DELETE
USING (true);
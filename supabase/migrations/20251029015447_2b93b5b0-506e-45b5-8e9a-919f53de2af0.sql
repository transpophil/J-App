-- Add DELETE policy for drivers table
CREATE POLICY "Anyone can delete drivers"
ON public.drivers
FOR DELETE
USING (true);

-- Add UPDATE policy for drivers table (for completeness)
CREATE POLICY "Anyone can update drivers"
ON public.drivers
FOR UPDATE
USING (true);
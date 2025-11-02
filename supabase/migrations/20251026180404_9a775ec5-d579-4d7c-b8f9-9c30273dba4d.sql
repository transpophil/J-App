-- Create passengers table
CREATE TABLE public.passengers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  default_pickup_location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for passengers
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;

-- RLS policies for passengers
CREATE POLICY "Anyone can view passengers" 
ON public.passengers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create passengers" 
ON public.passengers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update passengers" 
ON public.passengers 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete passengers" 
ON public.passengers 
FOR DELETE 
USING (true);

-- Create message_templates table
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  template_text TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for message_templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_templates
CREATE POLICY "Anyone can view templates" 
ON public.message_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update templates" 
ON public.message_templates 
FOR UPDATE 
USING (true);

-- Insert default message templates
INSERT INTO public.message_templates (template_key, template_text, description) VALUES
('lets_go', '[driver] is on his way with [passenger]. ETA [eta]', 'Message sent when driver starts trip'),
('delay', '[driver] is delayed by [delay] minutes for [passenger]', 'Message sent when there is a delay'),
('five_min_warning', '[driver] will arrive in 5 minutes with [passenger]', 'Message sent 5 minutes before arrival'),
('drop_off', '[driver] has dropped off [passenger] at [location]', 'Message sent when trip is completed');

-- Add trip tracking fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS eta TEXT,
ADD COLUMN IF NOT EXISTS delay_minutes INTEGER,
ADD COLUMN IF NOT EXISTS trip_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS five_min_warning_sent_at TIMESTAMP WITH TIME ZONE;

-- Add triggers for updated_at on new tables
CREATE TRIGGER update_passengers_updated_at
BEFORE UPDATE ON public.passengers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
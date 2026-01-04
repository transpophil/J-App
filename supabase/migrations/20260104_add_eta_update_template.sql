-- Seed a default template for ETA updates due to delay
INSERT INTO public.message_templates (template_key, template_text, description)
SELECT 'eta_update', 'Due to delay [driver] has a new ETA [eta]. please be aware', 'Message when driver updates ETA due to delay'
WHERE NOT EXISTS (
  SELECT 1 FROM public.message_templates WHERE template_key = 'eta_update'
);
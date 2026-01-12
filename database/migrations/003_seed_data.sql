-- Insert demo subscription plans metadata (for reference)
INSERT INTO public.analytics (user_id, event_type, event_data)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system_init',
  '{
    "plans": {
      "free": {"coins_per_month": 100, "max_documents": 10},
      "pro": {"coins_per_month": 1000, "max_documents": 100, "price": 9.99},
      "enterprise": {"coins_per_month": 10000, "max_documents": -1, "price": 49.99}
    }
  }'::jsonb
);

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cron job to run daily at midnight UTC
SELECT cron.schedule(
  'process-project-automation',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://zordawdxilrnakxroqjr.supabase.co/functions/v1/process-project-automation',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || current_setting('app.settings.service_role_key')
      )
    ) AS request_id;
  $$
);
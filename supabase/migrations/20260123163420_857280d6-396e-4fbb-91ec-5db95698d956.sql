-- Corrige política permissiva de logs
DROP POLICY IF EXISTS "System can insert logs" ON public.activity_logs;

-- Apenas edge functions (service role) podem inserir logs
-- Não é necessária política para INSERT pois edge functions usam service role
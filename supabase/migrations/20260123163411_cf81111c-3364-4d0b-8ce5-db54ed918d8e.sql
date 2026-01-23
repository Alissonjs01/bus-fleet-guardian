-- Enum para roles de admin
CREATE TYPE public.app_role AS ENUM ('admin');

-- Tabela de licenças
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(32) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  plan VARCHAR(20) DEFAULT 'monthly' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_activations INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de ativações
CREATE TABLE public.activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE NOT NULL,
  fingerprint_hash VARCHAR(64) NOT NULL,
  activated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_validated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(license_id, fingerprint_hash)
);

-- Tabela de roles de admin (separada conforme boas práticas)
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Logs de atividade
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilita RLS em todas as tabelas
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Função para verificar role de admin (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas RLS para licenses (apenas admin pode gerenciar)
CREATE POLICY "Admins can manage licenses"
ON public.licenses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para activations
CREATE POLICY "Admins can manage activations"
ON public.activations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para admin_roles
CREATE POLICY "Admins can view admin roles"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para activity_logs
CREATE POLICY "Admins can view logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_licenses_updated_at
BEFORE UPDATE ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_licenses_status ON public.licenses(status);
CREATE INDEX idx_licenses_key ON public.licenses(key);
CREATE INDEX idx_activations_license_id ON public.activations(license_id);
CREATE INDEX idx_activity_logs_license_id ON public.activity_logs(license_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
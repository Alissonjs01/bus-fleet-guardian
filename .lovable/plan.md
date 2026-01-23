
# Plano de Implementação: Sistema de Licenciamento e Painel Administrativo

## Resumo Executivo

Este plano adiciona um sistema completo de licenciamento por assinatura mensal ao aplicativo de gestão de frotas existente, incluindo:
- Ativacao online obrigatoria com funcionamento offline
- Vinculacao de licenca a um unico computador (fingerprint)
- Painel administrativo exclusivo e invisivel para usuarios finais
- Arquitetura preparada para cobranca mensal futura

**Impacto no app existente**: ZERO alteracoes visuais ou funcionais para usuarios finais.

---

## Arquitetura do Sistema

```text
+------------------+     +------------------+     +------------------+
|   FRONTEND       |     |    BACKEND       |     |   BANCO DADOS    |
|   (React)        |<--->|   (Supabase      |<--->|   (Supabase      |
|                  |     |    Edge Funcs)   |     |    Postgres)     |
+------------------+     +------------------+     +------------------+
        |                        |
        v                        v
+------------------+     +------------------+
| License Guard    |     | JWT RS256        |
| (Rota protegida) |     | (Chave publica)  |
+------------------+     +------------------+
```

---

## Fase 1: Estrutura de Dados e Tipos

### 1.1 Novos tipos TypeScript

**Arquivo**: `src/types/license.ts`

```typescript
// Tipos para o sistema de licenciamento
export interface License {
  id: string;
  key: string;
  status: 'active' | 'expired' | 'blocked' | 'pending';
  plan: 'monthly';
  expires_at: string;
  max_activations: number;
  created_at: string;
  updated_at: string;
}

export interface Activation {
  id: string;
  license_id: string;
  fingerprint_hash: string;
  activated_at: string;
  last_validated_at: string;
}

export interface LicenseToken {
  license_id: string;
  fingerprint_hash: string;
  issued_at: number;
  expires_at: number;
  plan: 'monthly';
}

export interface LicenseState {
  isActivated: boolean;
  isValid: boolean;
  token: string | null;
  expiresAt: string | null;
  lastValidation: string | null;
  offlineGracePeriod: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  created_at: string;
}
```

---

## Fase 2: Servicos de Licenciamento (Frontend)

### 2.1 Geracao de Fingerprint

**Arquivo**: `src/services/fingerprint.ts`

Funcionalidades:
- Coleta dados do navegador (userAgent, idioma, resolucao, timezone, etc.)
- Gera hash SHA-256 deterministico e estavel
- Nunca expoe dados brutos do sistema

### 2.2 Servico de Licenca

**Arquivo**: `src/services/licenseService.ts`

Funcionalidades:
- `activateLicense(key: string)`: Ativa licenca no servidor
- `validateLicense()`: Valida licenca periodicamente
- `getLicenseState()`: Retorna estado atual da licenca
- `clearLicense()`: Remove licenca local (logout)

### 2.3 Armazenamento Local

**Arquivo**: `src/utils/licenseStorage.ts`

Funcionalidades:
- Salvar/recuperar token JWT do localStorage
- Salvar/recuperar timestamp da ultima validacao
- Verificar periodo de carencia offline (72h)

---

## Fase 3: Componentes de Ativacao

### 3.1 Tela de Ativacao

**Arquivo**: `src/pages/Activation.tsx`

Design: Segue EXATAMENTE o padrao da tela de Login existente:
- Usa componentes `Card`, `CardHeader`, `CardContent`, `CardTitle`
- Usa `Input` e `Button` existentes
- Mesmas classes CSS e espacamento
- Icone `Key` do lucide-react

Estados da tela:
1. **Padrao**: Campo para license key + botao "Ativar"
2. **Carregando**: Botao desabilitado com spinner
3. **Sucesso**: Mensagem verde + redirecionamento automatico
4. **Erro**: Mensagem vermelha com descricao do problema
   - "Chave invalida"
   - "Licenca expirada"
   - "Licenca ja ativada em outro computador"
   - "Sem conexao com o servidor"
5. **Bloqueio**: Tela de aviso quando licenca foi revogada

### 3.2 License Guard (Protetor de Rotas)

**Arquivo**: `src/components/auth/LicenseGuard.tsx`

Funcionalidades:
- Envolve rotas protegidas
- Verifica se licenca esta ativada e valida
- Redireciona para `/activation` se invalida
- Executa validacao periodica (a cada 24h)
- Gerencia periodo de carencia offline (72h)

---

## Fase 4: Painel Administrativo (ADMIN)

### 4.1 Estrutura de Pastas

```text
src/
  admin/
    pages/
      AdminLogin.tsx      # Login exclusivo do admin
      AdminDashboard.tsx  # Painel principal
      LicenseList.tsx     # Lista de licencas
      LicenseDetail.tsx   # Detalhes de uma licenca
    components/
      AdminLayout.tsx     # Layout do painel admin
      AdminSidebar.tsx    # Menu lateral admin
      LicenseTable.tsx    # Tabela de licencas
      LicenseForm.tsx     # Formulario criar/editar
    hooks/
      useAdminAuth.ts     # Hook de autenticacao admin
    services/
      adminService.ts     # API do admin
```

### 4.2 Rota do Admin

**IMPORTANTE**: Rota nao aparece em menus ou navegacao do app principal.

- Rota: `/admin-panel-secure` (URL nao obvio)
- Acesso: Somente via digitacao direta da URL
- Autenticacao: Login separado com email + senha forte

### 4.3 Funcionalidades do Painel

1. **Dashboard Admin**:
   - Total de licencas ativas/expiradas/bloqueadas
   - Graficos de uso
   - Ultimas ativacoes

2. **Gerenciamento de Licencas**:
   - Listar todas as licencas
   - Filtrar por status
   - Ver fingerprint ativado
   - Resetar ativacao (liberar para novo computador)
   - Bloquear/desbloquear licenca
   - Alterar data de expiracao
   - Gerar nova license key

3. **Logs de Atividade**:
   - Historico de ativacoes
   - Tentativas de validacao
   - Bloqueios automaticos

---

## Fase 5: Backend (Supabase Edge Functions)

### 5.1 Tabelas do Banco de Dados

```sql
-- Tabela de licencas
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(32) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  plan VARCHAR(20) DEFAULT 'monthly',
  expires_at TIMESTAMPTZ NOT NULL,
  max_activations INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de ativacoes
CREATE TABLE activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  fingerprint_hash VARCHAR(64) NOT NULL,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(license_id, fingerprint_hash)
);

-- Tabela de admins
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de atividade
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Edge Functions

**Funcao**: `activate-license`
- Endpoint: POST /activate
- Valida license key
- Verifica status e expiracao
- Vincula fingerprint
- Retorna JWT assinado

**Funcao**: `validate-license`
- Endpoint: POST /validate
- Verifica token JWT
- Atualiza last_validated_at
- Retorna novo token se necessario

**Funcao**: `admin-auth`
- Endpoint: POST /admin/login
- Autentica admin
- Retorna token de sessao admin

**Funcao**: `admin-licenses`
- Endpoints CRUD para gerenciamento
- Protegido por token admin

---

## Fase 6: Integracao com App Existente

### 6.1 Modificacao no App.tsx

```typescript
// ADICAO - nao modifica rotas existentes
import { LicenseGuard } from "@/components/auth/LicenseGuard";
import Activation from "@/pages/Activation";
import AdminLogin from "@/admin/pages/AdminLogin";
import AdminDashboard from "@/admin/pages/AdminDashboard";

// Novas rotas ADICIONADAS (nao substitui nenhuma)
<Route path="/activation" element={<Activation />} />
<Route path="/admin-panel-secure" element={<AdminLogin />} />
<Route path="/admin-panel-secure/dashboard" element={<AdminDashboard />} />

// Rota principal ENVOLVIDA pelo LicenseGuard
<Route path="/" element={
  <LicenseGuard>
    <Index />
  </LicenseGuard>
} />
```

### 6.2 Fluxo do Usuario Final

```text
1. Usuario abre o app
         |
         v
2. LicenseGuard verifica licenca
         |
    +----+----+
    |         |
    v         v
3a. Valida  3b. Invalida
    |             |
    v             v
4a. App      4b. Tela de
    Normal       Ativacao
```

### 6.3 Fluxo de Validacao Periodica

```text
1. App aberto com licenca ativa
         |
         v
2. Verifica ultima validacao
         |
    +----+----+----+
    |         |    |
    v         v    v
3a. <24h    3b. 24-72h    3c. >72h
    |            |              |
    v            v              v
4a. OK      4b. Modo        4c. Bloqueia
    Normal      Offline         app
                Grace
```

---

## Fase 7: Seguranca

### 7.1 Medidas Implementadas

1. **Chave Privada**: Existe SOMENTE no backend (Supabase secrets)
2. **Validacao JWT**: Frontend usa apenas chave publica
3. **HTTPS**: Todas as comunicacoes criptografadas
4. **Fingerprint Hash**: Dados brutos nunca transmitidos
5. **Rate Limiting**: Limite de tentativas de ativacao
6. **Admin Isolado**: Rotas e autenticacao separadas

### 7.2 Protecoes Anti-Bypass

- Token expira a cada 24h (requer revalidacao)
- Periodo de carencia maximo de 72h offline
- Fingerprint verificado em cada validacao
- Logs de todas as atividades

---

## Arquivos a Serem Criados

| Arquivo | Descricao |
|---------|-----------|
| `src/types/license.ts` | Tipos TypeScript |
| `src/services/fingerprint.ts` | Geracao de fingerprint |
| `src/services/licenseService.ts` | Servico de licenca |
| `src/utils/licenseStorage.ts` | Armazenamento local |
| `src/pages/Activation.tsx` | Tela de ativacao |
| `src/components/auth/LicenseGuard.tsx` | Protetor de rotas |
| `src/admin/pages/AdminLogin.tsx` | Login admin |
| `src/admin/pages/AdminDashboard.tsx` | Painel admin |
| `src/admin/pages/LicenseList.tsx` | Lista licencas |
| `src/admin/components/AdminLayout.tsx` | Layout admin |
| `src/admin/components/LicenseTable.tsx` | Tabela licencas |
| `src/admin/services/adminService.ts` | API admin |
| `src/admin/hooks/useAdminAuth.ts` | Auth hook admin |

## Arquivos a Serem Modificados

| Arquivo | Modificacao |
|---------|-------------|
| `src/App.tsx` | Adicionar novas rotas + LicenseGuard |

---

## Ordem de Implementacao

1. Criar tipos TypeScript (`license.ts`)
2. Criar servico de fingerprint
3. Criar servico de licenca (mock inicial)
4. Criar tela de ativacao
5. Criar LicenseGuard
6. Integrar no App.tsx
7. Criar estrutura admin
8. Criar painel admin completo
9. Configurar Supabase (tabelas)
10. Criar Edge Functions
11. Conectar frontend ao backend real

---

## Secao Tecnica

### Geracao de Fingerprint (Detalhes)

```typescript
// Componentes usados para fingerprint
const components = [
  navigator.userAgent,
  navigator.language,
  screen.width + 'x' + screen.height,
  screen.colorDepth,
  new Date().getTimezoneOffset(),
  navigator.hardwareConcurrency,
  navigator.platform
];

// Hash SHA-256 para anonimizacao
const hash = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(components.join('|'))
);
```

### Estrutura do JWT

```json
{
  "license_id": "uuid",
  "fingerprint_hash": "sha256...",
  "issued_at": 1706000000,
  "expires_at": 1708678400,
  "plan": "monthly"
}
```

### Validacao Offline

```typescript
const GRACE_PERIOD_HOURS = 72;
const VALIDATION_INTERVAL_HOURS = 24;

function checkOfflineGrace(lastValidation: Date): boolean {
  const hoursSinceValidation = 
    (Date.now() - lastValidation.getTime()) / (1000 * 60 * 60);
  return hoursSinceValidation <= GRACE_PERIOD_HOURS;
}
```

---

## Preparacao para Cobranca Mensal

A estrutura esta preparada para integracao futura com gateway de pagamento:

1. Campo `expires_at` controla validade
2. Status `expired` ativa automaticamente apos vencimento
3. Webhook pode renovar `expires_at` apos pagamento
4. Logs registram todas as renovacoes

**Integracao futura**: Adicionar endpoint `/webhook/payment` que recebe confirmacao do gateway e atualiza `expires_at` + `status`.

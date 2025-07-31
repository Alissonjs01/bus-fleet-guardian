# Sistema Mobile - Motoristas

Esta é a versão mobile do sistema de gestão de frota, desenvolvida para ser usada pelos motoristas em seus celulares.

## 📱 Funcionalidades

### Login
- Autenticação com número de registro do motorista
- Validação via API do sistema supervisor
- Armazenamento local seguro das credenciais

### Dashboard do Motorista
- Visualização do status atual (viagem ativa/inativa)
- Botões para iniciar/finalizar viagem
- Indicadores de problemas pendentes
- Status de conexão online/offline
- Sincronização automática de dados

### Controle de Viagem
- **Iniciar Viagem**: Registra saída com número do veículo
- **Finalizar Viagem**: Registra retorno e problemas encontrados
- Controle de tempo automático
- Armazenamento offline para situações sem conexão

### Reporte de Problemas
- Categorias: Elétrica, Mecânica, Funilaria, Limpeza, Pneus, Outros
- Níveis de gravidade: Baixa, Média, Alta, Crítica
- Descrição detalhada obrigatória
- Preparado para anexar fotos (implementação futura)

### Histórico
- Visualização de viagens anteriores
- Estatísticas pessoais (total de viagens, problemas, quilometragem)
- Filtros por viagens e problemas
- Detalhes de cada viagem realizada

## 🔌 Integração com Sistema Supervisor

### APIs Implementadas
```typescript
// Autenticação
POST /login
Body: { numeroRegistro: string }
Response: { success: boolean, data: { nome: string } }

// Registrar saída
POST /saida
Body: { vehicleNumber: string, driverNumber: string, timestamp: string }

// Registrar retorno
POST /retorno
Body: { vehicleNumber: string, driverNumber: string, timestamp: string, problems: ProblemReport[] }

// Reportar problema individual
POST /problema
Body: ProblemReport

// Obter histórico do motorista
GET /historico/:numeroRegistro
Response: { success: boolean, data: TripHistory[] }

// Sincronização
POST /sync
Body: { timestamp: string }
```

### Estrutura de Dados
```typescript
interface ProblemReport {
  id: string;
  vehicleNumber: string;
  driverNumber: string;
  categoria: 'eletrica' | 'mecanica' | 'funilaria' | 'limpeza' | 'pneus' | 'outros';
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  observacao: string;
  reportedAt: string;
  images?: string[];
}

interface TripSession {
  id: string;
  vehicleNumber: string;
  driverNumber: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
}
```

## 🛠️ Funcionalidades Offline

### Armazenamento Local
- Dados do motorista logado
- Sessão de viagem ativa
- Problemas pendentes de sincronização
- Fila de ações offline

### Sincronização Automática
- Detecta quando a conexão volta
- Envia dados pendentes automaticamente
- Resolve conflitos de sincronização
- Mantém histórico local atualizado

## 📂 Estrutura de Arquivos

```
src/mobile/
├── components/           # Componentes específicos do mobile
│   └── MobileLayout.tsx  # Layout base com header e navegação
├── pages/                # Telas do aplicativo mobile
│   ├── MobileLogin.tsx   # Tela de login
│   ├── MobileDashboard.tsx # Dashboard principal
│   ├── TripStart.tsx     # Iniciar viagem
│   ├── TripEnd.tsx       # Finalizar viagem
│   ├── ProblemReport.tsx # Reportar problemas
│   └── History.tsx       # Histórico de viagens
├── services/             # Serviços de API
│   └── api.ts           # Comunicação com o servidor
├── utils/                # Utilitários
│   └── storage.ts       # Gerenciamento do localStorage
├── types/                # Tipos TypeScript
│   └── mobile.ts        # Interfaces específicas do mobile
└── MobileApp.tsx        # Aplicativo principal
```

## 🚀 Como Usar

### Para Desenvolvimento
1. Acesse `/mobile` no navegador
2. Use dados de teste para login (ex: "M001")
3. Teste todas as funcionalidades offline/online

### Para Produção (Electron)
1. Configure a URL da API em `src/mobile/services/api.ts`
2. Implemente o servidor Node.js com as APIs listadas
3. Configure a rede Wi-Fi local para comunicação
4. Build e empacote com Electron

## 🔧 Configurações Necessárias

### No Servidor (Sistema Supervisor)
```javascript
// Exemplo de endpoint para o servidor Express
app.post('/login', (req, res) => {
  const { numeroRegistro } = req.body;
  const motorista = database.motoristas.find(m => m.numeroRegistro === numeroRegistro);
  
  if (motorista) {
    res.json({ success: true, data: { nome: motorista.nome } });
  } else {
    res.json({ success: false, message: 'Motorista não encontrado' });
  }
});
```

### No Mobile
```typescript
// Configurar URL do servidor em api.ts
const API_BASE_URL = 'http://192.168.1.100:3000'; // IP do PC supervisor
```

## 📱 Design Responsivo

O sistema foi desenvolvido com foco em dispositivos móveis:
- Interface otimizada para telas pequenas
- Navegação por gestos
- Botões grandes para facilitar o toque
- Feedback visual claro
- Modo offline completo

## 🔒 Segurança

- Autenticação obrigatória
- Dados criptografados no localStorage
- Validação de sessão
- Controle de acesso por motorista
- Log de todas as ações

## 🌐 Rede Local

O sistema funciona em rede Wi-Fi local:
- Não requer internet
- Comunicação direta com o PC supervisor
- Sincronização em tempo real quando online
- Backup automático dos dados

## 📋 TODO - Implementações Futuras

- [ ] Captura e upload de fotos dos problemas
- [ ] Notificações push para alertas
- [ ] GPS para tracking de rotas
- [ ] Modo escuro/claro
- [ ] Suporte a múltiplos idiomas
- [ ] Backup na nuvem opcional
- [ ] Relatórios em PDF
- [ ] Chat com supervisor
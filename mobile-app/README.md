# Mobile Fleet Management App

## Descrição
Aplicativo mobile para motoristas da frota, permitindo iniciar/finalizar viagens e reportar problemas.

## Estrutura do Projeto
```
mobile-app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── types/
│   └── utils/
├── android/
└── package.json
```

## Funcionalidades
- Login de motoristas
- Início e fim de viagem
- Relatório de problemas
- Histórico de viagens
- Sincronização offline

## Como executar
1. `npm install`
2. `npm run dev` (web)
3. `npm run android` (mobile)

## Conexão com Sistema Desktop
O app mobile se conecta via API REST com o sistema desktop para sincronização de dados.
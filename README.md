# Sistema de Frota

Plataforma de gestao de frota com painel desktop para administracao/gestao e experiencia mobile para motoristas.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Cloud Functions

## Como executar localmente

```sh
npm install
npm run dev
```

Por padrao o Vite sobe a aplicacao em ambiente local e mostra a URL no terminal.

## Build

```sh
npm run build
```

## Deploy

Firebase Hosting:

```sh
firebase deploy --only hosting --project gestao-frota-bus
```

Netlify:

- Build command: `npm run build`
- Publish directory: `dist`
- O fallback SPA esta configurado em `netlify.toml` e `public/_redirects`.

## Variaveis de ambiente

Use `.env.example` como base para criar o `.env.local`.

Nunca envie arquivos `.env` reais para o repositorio.

## Acessos

O painel desktop usa Firebase Authentication. O app mobile de motorista usa validacao por registro de motorista no Firestore.

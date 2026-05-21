# Estudo: brincadeira da tela inicial mobile

Este documento registra a feature temporaria da tela inicial mobile para reaproveitamento futuro. Ele e apenas memoria tecnica: a brincadeira nao foi reativada no app atual.

## Linha do tempo

- `1808c95` - `Add temporary mobile gate`
  - Criou `MobileGate.tsx`.
  - Criou `mobileGateConfig.ts`.
  - Inseriu o gate antes das telas reais do mobile.
  - Salvava resposta em `mobileGateAnswers`.
  - Usava `localStorage` para aparecer uma vez por dispositivo.
- `7d03ee6` - `Show mobile gate answers in admin`
  - Criou a tela admin `/admin/mobile-gate`.
  - Liberou leitura da collection para admin nas regras do Firestore.
  - Adicionou item de menu "Respostas Mobile".
- `26d2209` - `Show mobile gate on every page load`
  - Removeu o controle por `localStorage`.
  - O gate passou a aparecer a cada carregamento da rota mobile.
- `414dd33` - `Restore mobile foot size gate`
  - Restaurou o gate apos uma remocao temporaria.
- `e703637` - `Add playful mobile gate reactions`
  - Adicionou reacoes conforme a resposta em centimetros.
  - Reacao aparecia enquanto o usuario movia o controle.
- `b1e4bd8` - `Show mobile gate reaction after confirmation`
  - Ajustou a experiencia final: a reacao aparece somente depois de confirmar.
  - A tela segura o usuario por 3 segundos antes de liberar o app mobile.
- `8a0c3dd` - `Remove mobile prank gate`
  - Removeu o componente mobile e o config.
  - Removeu o bloqueio em `MobileApp.tsx`.

## Comportamento final antes da remocao

A tela aparecia antes de qualquer view real do mobile. O usuario via uma verificacao chamada "Verificacao Mobile" com a pergunta "Qual tamanho do seu pe?". A resposta era escolhida em um `Slider` de 10 a 20 cm, com valor inicial 14 cm.

Ao confirmar:

1. A resposta era salva no Firestore em `mobileGateAnswers`.
2. O app coletava dados simples do dispositivo:
   - `platform`
   - `language`
   - resolucao da tela
   - tamanho do viewport
   - status online
   - `userAgent`
3. Uma reacao era exibida por 3 segundos.
4. O mobile era liberado mesmo se o salvamento falhasse.

Esse ultimo ponto era correto para uma brincadeira: ela nao podia bloquear o uso real do sistema.

## Reacoes

Funcao historica: `getFootReaction(answerCm: number)`.

- `answerCm <= 14`
  - face: `:|`
  - titulo: `Na media`
  - texto: `Nada suspeito por aqui. Sistema quase convencido.`
- `answerCm <= 17`
  - face: `:o`
  - titulo: `Agora impoe respeito`
  - texto: `Esse tamanho ja chega fazendo presenca na garagem.`
- acima de 17
  - face: `O_O`
  - titulo: `Nivel derrubar manga`
  - texto: `Confirmando se isso e pe ou ferramenta de alcance rural.`

## Arquivos historicos importantes

Versao final antes da remocao:

- `b1e4bd8:mobile-app/src/components/MobileGate.tsx`
- `b1e4bd8:mobile-app/src/config/mobileGateConfig.ts`
- `b1e4bd8:mobile-app/src/MobileApp.tsx`
- `b1e4bd8:src/admin/pages/MobileGateAnswers.tsx`

Primeira implementacao:

- `1808c95:mobile-app/src/components/MobileGate.tsx`
- `1808c95:mobile-app/src/config/mobileGateConfig.ts`

Remocao:

- `8a0c3dd`

## Encaixe antigo no MobileApp

Na versao final antes da remocao, `MobileApp.tsx` tinha:

- `gateCompleted`, iniciado com `!MOBILE_GATE_CONFIG.enabled`.
- import de `MobileGate`.
- import de `MOBILE_GATE_CONFIG`.
- retorno antecipado:

```tsx
if (!gateCompleted) {
  return <div className="mobile-app"><MobileGate onComplete={() => setGateCompleted(true)} /></div>;
}
```

Se a feature voltar, esse e o ponto de integracao minimo. Mas e melhor reintroduzir com um nome menos temporario e com controle por config/env, para ligar e desligar sem novo commit.

## Firestore

Collection usada: `mobileGateAnswers`.

Formato dos documentos:

```ts
{
  question: string;
  answerCm: number;
  createdAt: serverTimestamp();
  userAgent: string;
  deviceInfo: {
    platform: string;
    language: string;
    screen: string;
    viewport: string;
    online: boolean;
  };
}
```

Regra inicial de escrita:

```js
match /mobileGateAnswers/{answerId} {
  allow create: if request.resource.data.keys().hasOnly(['question', 'answerCm', 'createdAt', 'userAgent', 'deviceInfo']) &&
    request.resource.data.question is string &&
    request.resource.data.answerCm is number &&
    request.resource.data.answerCm >= 10 &&
    request.resource.data.answerCm <= 20 &&
    request.resource.data.userAgent is string;
  allow read: if isAdmin();
  allow update, delete: if false;
}
```

Ponto de cuidado: se voltarmos a usar isso, vale validar melhor `deviceInfo` na regra e talvez adicionar `companyId` se a coleta precisar ser separada por empresa.

## Admin

A tela `MobileGateAnswers.tsx` listava as respostas em tempo real com `onSnapshot`, ordenando por `createdAt desc`.

Ela mostrava:

- pergunta respondida;
- valor em cm;
- data formatada;
- plataforma;
- tela;
- viewport;
- idioma;
- user agent.

O menu ficava em `src/admin/components/AdminLayout.tsx` com label `Respostas Mobile` e icone `Footprints`.

Observacao: no estado atual do projeto, a pagina admin historica pode ainda existir, mas a coleta mobile foi removida. Antes de reaproveitar, revisar se ainda faz sentido manter a rota/admin ou renomear para algo mais generico.

## Decisoes de design que funcionaram

- A brincadeira era isolada em um componente proprio.
- O app real era liberado mesmo em erro de rede.
- A reacao pos-confirmacao dava o timing comico certo.
- A coleta no admin permitia ver quem passou pela tela.
- O uso de `Slider` deixava a interacao simples no celular.

## Riscos para uma volta futura

- Pode irritar usuario se aparecer sempre. Para producao, preferir uma configuracao por periodo, usuario, campanha ou `localStorage`.
- A pergunta e os textos precisam ficar claramente leves para nao parecerem parte real de seguranca.
- O delay de 3 segundos e bom para piada, mas longo para uso frequente.
- Evitar registrar dados sensiveis sem necessidade. `userAgent` e dados de tela sao ok para diagnostico leve, mas devem continuar sem identificadores pessoais extras.
- Se a rota mobile for usada por motoristas em horario de trabalho, ativar so quando houver contexto apropriado.

## Como restaurar depois sem ligar automaticamente

Plano recomendado:

1. Recuperar `MobileGate.tsx` a partir de `b1e4bd8`.
2. Criar config nova com `enabled: false` por padrao.
3. Usar variavel de ambiente, por exemplo `VITE_MOBILE_GATE_ENABLED`.
4. Manter `onComplete` liberando o app em qualquer erro.
5. Adicionar regra Firestore com validacao de `deviceInfo`.
6. Testar mobile em viewport pequeno e desktop.
7. So depois ligar a flag.

Comando util para recuperar o arquivo historico quando chegar a hora:

```sh
git show b1e4bd8:mobile-app/src/components/MobileGate.tsx
```

Para ver a remocao completa:

```sh
git show 8a0c3dd
```

## Estado atual deste estudo

Este arquivo foi criado para memoria do projeto. Nenhuma importacao, rota mobile ou componente executavel foi reativado.

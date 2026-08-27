# Iray — espaço privado a dois

App web instalável (PWA). Sem WhatsApp, sem Telegram, sem risco de ban —
é só a vossa app a falar com o vosso próprio servidor.

## Como pôr a funcionar

1. Os nomes e PINs (Yanick / Iracema) já estão fixos em `server.js` — só
   precisas de mudar ali se quiseres trocar os PINs mais tarde.
2. Copia `.env.example` para `.env` e preenche só `GROQ_API_KEY`
   (opcional; sem isto o chat entre vocês os dois funciona na mesma, só
   o Iray não responde).
3. Instala e arranca:
   ```
   npm install
   npm start
   ```
4. Faz deploy num serviço que suporte processos sempre-online com
   WebSocket (Railway, Render, Fly.io, um VPS, etc.).

## Como instalar no telemóvel

1. Abre o link da app no browser do telemóvel (Chrome no Android, Safari
   no iPhone).
2. Android: menu (⋮) → "Adicionar ao ecrã principal".
   iPhone: botão partilhar → "Adicionar ao ecrã principal".
3. Fica com ícone próprio e abre em ecrã inteiro, como uma app normal.
4. Ao abrir, pede só o PIN — cada um usa o seu (Yanick: 8414, Iracema:
   8614) e a app já sabe quem é quem, sem mostrar nomes antes de entrar.

## Como funciona

- Mensagens entre vocês os dois: em tempo real, guardadas em
  `data/chat.json` no servidor.
- Para falar com o Iray, basta mencionar "iray" na mensagem — ele só
  responde quando é chamado, para não interromper a conversa dos dois.

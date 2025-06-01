# Discord GitHub Webhook on Vercel

Este proyecto permite recibir eventos `push` y `pull_request` desde GitHub y reenviarlos a un canal de Discord usando un Webhook.

## Configuración

1. Reemplaza la URL del webhook de Discord en `api/github-webhook.js`:
   ```js
   const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/XXXXXXXXX/YYYYYYYYY';
   ```

2. Sube este proyecto a un repositorio en GitHub.

3. Despliega en Vercel (https://vercel.com).

4. En GitHub, configura un Webhook con la URL:
   ```
   https://<tu-proyecto>.vercel.app/api/github-webhook
   ```

   Selecciona solo los eventos:
   - Push
   - Pull request

## Listo ✅
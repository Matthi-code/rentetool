# Learnings

## 2026-01-22

### Vercel build failures door ESLint
- **Probleem:** Ongebruikte variabelen (`STRATEGIE_LABELS`, `handleUpdateStrategie`) breken de Vercel build
- **Oorzaak:** ESLint `no-unused-vars` regel is strict in productie builds
- **Oplossing:** Verwijder ongebruikte imports/functies, of prefix met underscore (`_unused`)
- **Tip:** Altijd lokaal `npm run build` testen voor push

### Vercel cache problemen
- **Probleem:** Oude versie blijft geserveerd ondanks nieuwe deploy
- **Oplossing:** `npx vercel --prod --force` om cache te skippen
- **Browser:** Hard refresh (Cmd+Shift+R) of incognito venster

### Chrome vs andere browsers
- **Observatie:** Chrome heeft soms login/backend problemen, Brave en Firefox niet
- **Mogelijke oorzaken:** Agressieve caching, service workers, cookies
- **Nog onderzoeken:** Exacte oorzaak bepalen

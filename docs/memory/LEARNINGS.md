# Learnings

## 2026-03-02

### @supabase/ssr detecteert geen hash tokens
- **Probleem:** `createBrowserClient` van @supabase/ssr pikt `#access_token=...` niet op uit de URL
- **Oplossing:** Gebruik `createClient` van @supabase/supabase-js met `detectSessionInUrl: true` en `flowType: 'implicit'`
- **Tip:** Singleton pattern nodig zodat alle modules dezelfde client (en sessie) delen

### Magic link redirect flow
- **Probleem:** Dashboard (/) redirect naar /login voordat Supabase hash tokens verwerkt
- **Oplossing:** Check `window.location.hash.includes('access_token')` voordat je redirect
- **Flow:** Hash gedetecteerd → wacht op auth state change → user ingelogd → laad data → clear hash

### Supabase Management API beperkingen
- **Probleem:** PATCH requests naar Supabase Management API worden geblokkeerd door Cloudflare
- **Workaround:** POST naar `/v1/projects/{ref}/database/query` voor SQL operaties
- **Tip:** Voor config wijzigingen (rate limits, SMTP) moet je de Supabase dashboard gebruiken

### Vercel deploy vanuit subdirectory
- **Probleem:** `npx vercel` in root directory faalt voor Next.js in frontend/
- **Oplossing:** Altijd `cd frontend && npx vercel --prod` of configureer root directory in Vercel

---

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

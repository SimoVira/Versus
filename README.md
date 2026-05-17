# ⚡ Versus
### Piattaforma mobile di confronto prodotti tecnologici

> **Progetto di Maturità** — Simone Virano

---

## 📌 Cos'è Versus

Versus è un'app mobile che permette di confrontare prodotti tecnologici sfruttando l'intelligenza artificiale (Google Gemini via Vertex AI). L'utente seleziona due prodotti dalla stessa categoria, e l'app restituisce un'analisi dettagliata con punteggi, pro e contro, e un verdetto finale.

L'app supporta autenticazione con email/password e con Google OAuth, storico dei confronti, preferiti e aggiornamento automatico dei prezzi tramite AI con Google Search grounding.

---

## 🗂️ Struttura del progetto

```
Versus/
├── versus-server/       ← Backend Node.js + Express + TypeScript
└── versus-app/          ← Frontend React Native + Expo Router
```

---

## 🛠️ Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | React Native + Expo Router (TypeScript) |
| Navigazione | Expo Router (file-based routing) |
| Backend | Node.js + Express 5 + TypeScript |
| Database | MongoDB (driver nativo, senza Mongoose) |
| AI | Google Gemini 2.5 Flash via Vertex AI SDK |
| AI Search | Google Search grounding (per refresh prezzi) |
| Autenticazione | JWT + bcryptjs |
| Storage locale | AsyncStorage |
| Icone | @expo/vector-icons (Ionicons) |
| Tema | Sistema automatico dark/light via `useTheme()` |

---

## 📱 Schermate dell'app

| Schermata | File | Descrizione |
|---|---|---|
| Entry point | `app/index.tsx` | Redirect automatico al login |
| Login | `app/login.tsx` | Accesso con email/password o Google |
| Registrazione | `app/register.tsx` | Creazione account (collega la password a un account Google esistente) |
| Home | `app/(tabs)/home.tsx` | Griglia delle categorie prodotto |
| Ricerca | `app/search.tsx` | Lista prodotti per categoria, ricerca, preferiti (♥), dettaglio (ⓘ), selezione per confronto |
| Confronto | `app/compare.tsx` | Analisi AI con score animati, pro/contro, verdetto e vincitore |
| Preferiti | `app/(tabs)/favorites.tsx` | Prodotti salvati nei preferiti |
| Storico | `app/(tabs)/history.tsx` | Confronti passati, riapribili senza richiesta AI |
| Dettaglio prodotto | `app/products/[id].tsx` | Specifiche complete + aggiornamento prezzo AI |

---

## 📡 API del server

### Autenticazione (pubblica)

| Metodo | Route | Descrizione |
|---|---|---|
| POST | `/api/register` | Registrazione. Se l'email esiste con Google, aggiunge la password |
| POST | `/api/login` | Login con email e password |
| GET | `/api/google/start` | Avvia il flusso OAuth Google |
| GET | `/api/google/callback` | Callback OAuth Google |
| GET | `/api/google/status` | Polling stato OAuth (polling da app) |

> Tutte le route seguenti richiedono il token JWT nell'header `Authorization: Bearer <token>`.

### Prodotti

| Metodo | Route | Descrizione |
|---|---|---|
| GET | `/api/products` | Lista prodotti (filtri: `?category=`, `?search=`) |
| GET | `/api/products/:id` | Singolo prodotto |
| PATCH | `/api/products/:id/refresh-price` | Aggiorna il prezzo tramite AI + salva in `priceHistory` |

### Categorie

| Metodo | Route | Descrizione |
|---|---|---|
| GET | `/api/categories` | Lista delle categorie disponibili nel DB |

### Confronto

| Metodo | Route | Descrizione |
|---|---|---|
| POST | `/api/compare` | Confronto AI tra due prodotti. Body: `{ ids: ["id1", "id2"] }` |

### Preferiti

| Metodo | Route | Descrizione |
|---|---|---|
| GET | `/api/favorites` | Prodotti preferiti dell'utente |
| GET | `/api/favorites/check/:productId` | Controlla se un prodotto è nei preferiti |
| POST | `/api/favorites/:productId` | Aggiunge o rimuove dai preferiti (toggle) |

### Storico

| Metodo | Route | Descrizione |
|---|---|---|
| GET | `/api/history` | Lista confronti salvati (ordinati per data) |
| GET | `/api/history/:id` | Singolo confronto |
| DELETE | `/api/history/:id` | Elimina un confronto dallo storico |

---

## 🗄️ Struttura documenti MongoDB

### Collezione `products`

```json
{
  "_id": "ObjectId",
  "name": "iPhone 15",
  "brand": "Apple",
  "category": "smartphone",
  "price": 899,
  "lastUpdated": "2024-01-15T10:00:00.000Z",
  "searchQuery": "iPhone 15 prezzo",
  "priceHistory": [
    { "price": 929, "date": "2024-01-01", "source": "amazon.it" }
  ],
  "specs": {
    "RAM": "6GB",
    "storage": "128GB",
    "batteria": "3877mAh",
    "display": "6.1 pollici",
    "processore": "A16 Bionic",
    "fotocamera": "48MP",
    "os": "iOS 17"
  }
}
```

### Collezione `users`

```json
{
  "_id": "ObjectId",
  "name": "Mario Rossi",
  "email": "mario@email.com",
  "password": "<bcrypt hash>",
  "googleId": "Google sub opzionale",
  "favorites": ["productId1", "productId2"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Collezione `comparisons`

```json
{
  "_id": "ObjectId",
  "userId": "userId string",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "compareResponse": {
    "products": [ { ... }, { ... } ],
    "geminiAnalysis": {
      "score1": 82,
      "score2": 75,
      "pros1": ["...", "...", "..."],
      "pros2": ["...", "...", "..."],
      "cons1": ["...", "..."],
      "cons2": ["...", "..."],
      "winner": 1,
      "verdict": "Testo verdetto finale..."
    }
  }
}
```

### Collezione `oauth_sessions`

```json
{
  "state": "random string",
  "status": "pending | done",
  "createdAt": "...",
  "token": "JWT (solo se done)",
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

---

## 🔑 Categorie prodotto supportate

`smartphone` · `laptop` · `tablet` · `monitor` · `cpu` · `gpu` · `headphones` · `smartwatch` · `console` · `router`

---

## ⚙️ Requisiti

- **Node.js** v18+
- **MongoDB** locale oppure connessione a MongoDB Atlas
- **Account Google Cloud** con Vertex AI abilitato (per le funzionalità AI)
- **Expo Go** oppure build APK per testare su dispositivo Android

---

## 🔑 Variabili d'ambiente

### `versus-server/.env`

```env
connectionStringAtlas=mongodb+srv://...
dbName=versus
PORT=3000
JWT_KEY=chiave_segreta_jwt
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://tuoserver.onrender.com/api/google/callback
```

### `versus-app/.env`

```env
EXPO_PUBLIC_PUBLIC_URL=https://tuoserver.onrender.com
```

---

## 🚀 Avvio in sviluppo

### Terminale 1 — Server

```bash
cd versus-server
npm install
npm run dev
```

Il server parte sulla porta definita in `PORT` (default 3000).

### Terminale 2 — App (stessa rete Wi-Fi)

```bash
cd versus-app
npm install
npx expo start --clear
```

Scannerizza il QR con **Expo Go** dal telefono.

### Rete diversa — con ngrok

```bash
# Terminale 2
ngrok http 3000
# Copia l'URL generato e aggiornalo in versus-app/.env → EXPO_PUBLIC_PUBLIC_URL
```

```bash
# Terminale 3
npx expo start --tunnel --clear
```

> ⚠️ L'URL di ngrok cambia ad ogni avvio — ricorda di aggiornarlo nel `.env`.

---

## 📦 Build APK (Android)

L'app viene distribuita come APK tramite **EAS Build** (Expo Application Services), senza necessità di Android Studio.

```bash
cd versus-app
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Il file APK è scaricabile dalla dashboard [expo.dev](https://expo.dev) al termine della build (~6-10 minuti).

### `eas.json`

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

---

## 🏗️ Architettura e scelte tecniche

### Client HTTP (`libreria.ts`)
Wrapper attorno a `fetch` che gestisce automaticamente: aggiunta del token JWT, serializzazione dei parametri GET, redirect al login in caso di `401`, gestione degli errori di rete.

### Autenticazione
JWT con scadenza 7 giorni, salvato in `AsyncStorage`. Google OAuth implementato con flusso redirect: l'app apre il browser di sistema tramite `expo-web-browser`, il backend gestisce il callback e salva il token su MongoDB; l'app fa polling su `/api/google/status` per recuperarlo.

### AI — Confronto prodotti
Usa `gemini-2.5-flash` via Vertex AI SDK. Il prompt invia nome, brand, prezzo e specifiche di entrambi i prodotti e chiede una risposta JSON strutturata con score, pro/contro e verdetto.

### AI — Refresh prezzi
Usa `gemini-2.5-flash-lite` con Google Search grounding. Cerca il prezzo attuale del prodotto su e-commerce italiani (Amazon.it, Unieuro, MediaWorld, ecc.) e aggiorna il campo `price` e `priceHistory` nel DB.

### Tema
Dark/light automatico basato sul tema di sistema. Ogni schermata usa `useTheme()` → `{ colors, isDark }` e definisce i propri stili tramite una funzione `makeStyles(colors)`.

---

## 👤 Autore

**Simone Virano** — Progetto di Maturità
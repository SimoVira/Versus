# ⚡ Versus
### Piattaforma di confronto prodotti tecnologici

---

## 📌 Cos'è Versus

Versus è un'app mobile che permette di confrontare prodotti tecnologici (smartphone, laptop, tablet, monitor, CPU, GPU, cuffie, smartwatch) analizzando caratteristiche e prezzi per aiutare l'utente a scegliere il prodotto migliore.

---

## 🗂️ Struttura del progetto

```
versus/
├── versus-server/   ← Backend Node.js + Express + TypeScript
└── versus-app/      ← Frontend React Native + Expo Go
```

---

## ⚙️ Requisiti

- **Node.js** v18+
- **MongoDB** in esecuzione locale oppure connessione a MongoDB Atlas
- **Expo Go** installato sul telefono (Android/iOS)
- **ngrok** per esporre il server in rete

---


## 🔑 Variabili d'ambiente CLIENT

Crea il file `versus-app/.env`:
```env
LocalURL = "http://TUO_IP:3000" //indirizzo ip della macchina su cui il server è in ascolto
PublicURL = "" //url pubblico che genera NGROK
```

## 🔑 Variabili d'ambiente server

Crea il file `versus-server/.env`:
```env
connectionString=mongodb://localhost:27017
dbName=versus
PORT=3000
```


## 🚀 Avvio del progetto su dispositivi connessi a rete UGUALE

Servono **3 terminali** aperti in contemporanea.

### Terminale 1 — Avvia il server
```bash
cd versus/versus-server
nodemon server.ts
```
Il server parte sulla porta `3000`.

> ⚠️ L'IP del dispositivo su cui è in ascolto il server cambia ad ogni avvio — ricorda di aggiornarlo in .env del client!

### Terminale 3 — Avvia l'app
```bash
cd versus/versus-app
npx expo start --clear
```
Scannerizza il QR con **Expo Go** dal telefono.


## 🚀 Avvio del progetto su dispositivi connessi a rete DIVERSA

### Terminale 1 — Avvia il server
```bash
cd versus/versus-server
nodemon server.ts
```
Il server parte sulla porta `3000`.

### Terminale 2 — Avvia ngrok
```bash
ngrok http 3000
```
Copia l'URL che ngrok genera (es. `https://abc123.ngrok-free.app`) e incollalo in:
```
versus-app/api/client.ts → const _URL = "https://..."
```
> ⚠️ L'URL di ngrok cambia ad ogni avvio —  ricorda di aggiornarlo in .env del client!

### Terminale 3 — Avvia l'app
```bash
cd versus/versus-app
npx expo start --tunnel --clear
```
Scannerizza il QR con **Expo Go** dal telefono.

---
---

## 📡 API disponibili

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET | `/api/categories` | Lista categorie presenti nel DB |
| GET | `/api/products` | Tutti i prodotti (filtrabili con `?category=` e `?search=`) |
| GET | `/api/products/:id` | Singolo prodotto |
| POST | `/api/products` | Inserimento nuovo prodotto |
| PATCH | `/api/products/:id` | Aggiornamento campi prodotto |
| DELETE | `/api/products/:id` | Eliminazione prodotto |
| POST | `/api/compare` | Confronto prodotti — body: `{ ids: ["id1", "id2"] }` |

---

## 📱 Schermate dell'app

| Schermata | File | Descrizione |
|-----------|------|-------------|
| Home | `app/index.tsx` | Lista categorie |
| Ricerca | `app/search.tsx` | Prodotti per categoria con ricerca |
| Dettaglio | `app/product/[id].tsx` | Specs complete di un prodotto |
| Confronto | `app/compare.tsx` | Confronto con punteggi |

---

## 🗄️ Struttura documento MongoDB

```json
{
  "_id": "ObjectId",
  "name": "iPhone 15",
  "brand": "Apple",
  "category": "smartphone",
  "price": 899,
  "images": ["https://..."],
  "commonScore": 87,
  "priceHistory": [
    { "price": 929, "date": "2024-01-01" }
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

---

## 🛠️ Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React Native + Expo Go |
| Navigazione | Expo Router |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB |
| Tunnel | ngrok |

---

## 👤 Autore

**Simone Virano** — Progetto di Maturità
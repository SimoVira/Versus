//A. import delle librerie
import http from "http";
import express from "express";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import queryStringParser from "./queryStringParser";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

//B. configurazioni
const app: express.Express = express();
dotenv.config({ path: ".env" });

const connectionString = process.env.connectionStringLocal;
const dbName = process.env.dbName;
const PORT = parseInt(process.env.PORT!);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

//C. creazione ed avvio del server HTTP
const server = http.createServer(app);

server.listen(PORT, function () {
    console.log("Versus server in ascolto sulla porta " + PORT);
});

//D. middleware

//1. request log
app.use("/", function (req, res, next) {
    console.log(req.method + ": " + req.originalUrl);
    next();
});

//2. lettura parametri POST (JSON, max 5mb)
app.use("/", express.json({ limit: "5mb" }));

//3. log dei parametri
app.use("/", function (req, res, next) {
    if (req.body && Object.keys(req.body).length > 0)
        console.log("      parametri body: " + JSON.stringify(req.body));
    else if (req.query && Object.keys(req.query).length > 0)
        console.log("      parametri query: " + JSON.stringify(req.query));
    next();
});

//4. Parsing dei parametri GET
app.use("/", queryStringParser)

//5. Vincoli CORS - accetto richieste da qualunque client (React Native incluso)
const corsOptions = {
    origin: function (origin: any, callback: any) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", cors(corsOptions));


//E. gestione delle risorse dinamiche

// -----------------------------------------------------------------
// PRODOTTI
// -----------------------------------------------------------------

// GET /api/products
// Restituisce tutti i prodotti, con filtri opzionali via query string
// es: /api/products?category=smartphone
app.get("/api/products", async function (req, res, next) {
    const filters: any = {};

    // filtro per categoria
    if (req.query.category)
        filters.category = req.query.category;

    // ricerca per nome (regex, case-insensitive)
    if (req.query.search)
        filters.name = { $regex: req.query.search, $options: "i" };

    const client = new MongoClient(connectionString!);

    await client.connect().catch(function () {
        res.status(503).send("Errore di connessione al dbms");
        return;
    });

    const collection = client.db(dbName).collection("products");
    const cmd = collection.find(filters).toArray();
    cmd.then(function (data) { res.send(data); });
    cmd.catch(function (err) { res.status(500).send("Errore query: " + err); });
    cmd.finally(function () { client.close(); });
});

// GET /api/products/:id
// Restituisce un singolo prodotto per _id
app.get("/api/products/:id", async function (req, res, next) {
    const _id = new ObjectId(req.params.id);

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function () {
        res.status(503).send("Errore di connessione al dbms");
        return;
    });
    const collection = client.db(dbName).collection("products");
    const cmd = collection.findOne({ _id });
    cmd.then(function (data) {
        if (!data) res.status(404).send("Prodotto non trovato");
        else res.send(data);
    });
    cmd.catch(function (err) { res.status(500).send("Errore query: " + err); });
    cmd.finally(function () { client.close(); });
});

// POST /api/products
// Aggiunge un nuovo prodotto
// body: { name, category, brand, price, specs: {...}, images: [] }
app.post("/api/products", async function (req, res, next) {
    const newProduct = req.body;

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function () {
        res.status(503).send("Errore di connessione al dbms");
        return;
    });
    const collection = client.db(dbName).collection("products");
    const cmd = collection.insertOne(newProduct);
    cmd.then(function (data) { res.send(data); });
    cmd.catch(function (err) { res.status(500).send("Errore inserimento: " + err); });
    cmd.finally(function () { client.close(); });
});

// PATCH /api/products/:id
// Aggiorna campi specifici di un prodotto (es. prezzo)
app.patch("/api/products/:id", async function (req, res, next) {
    const _id = new ObjectId(req.params.id);
    const fields = req.body;

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function () {
        res.status(503).send("Errore di connessione al dbms");
        return;
    });
    const collection = client.db(dbName).collection("products");
    const cmd = collection.updateOne({ _id }, { $set: fields });
    cmd.then(function (data) { res.send(data); });
    cmd.catch(function (err) { res.status(500).send("Errore aggiornamento: " + err); });
    cmd.finally(function () { client.close(); });
});

// DELETE /api/products/:id
// Elimina un prodotto
app.delete("/api/products/:id", async function (req, res, next) {
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function () {
        res.status(503).send("Errore di connessione al dbms");
        return;
    });
    const collection = client.db(dbName).collection("products");
    const cmd = collection.deleteOne({ _id: new ObjectId(req.params.id) });
    cmd.then(function (data) { res.send(data); });
    cmd.catch(function (err) { res.status(500).send("Errore eliminazione: " + err); });
    cmd.finally(function () { client.close(); });
});

// -----------------------------------------------------------------
// CONFRONTO (cuore di Versus)
// -----------------------------------------------------------------

// POST /api/compare
// body: { ids: ["id1", "id2", ...] }
// Restituisce i prodotti richiesti con un punteggio calcolato
app.post("/api/compare", async function (req, res, next) {
    const ids: string[] = req.body.ids;

    if (!ids || ids.length < 2) {
        res.status(400).send("Servono almeno 2 prodotti da confrontare");
        return;
    }

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function () {
        res.status(503).send("Errore di connessione al dbms");
        return;
    });

    try {
        const collection = client.db(dbName).collection("products");
        const objectIds = ids.map((id) => new ObjectId(id));
        const products = await collection.find({ _id: { $in: objectIds } }).toArray();

        // Calcolo punteggio qualità/prezzo semplice:
        // score = 100 - (prezzo_prodotto / prezzo_massimo * 100)
        // (il più economico prende il punteggio più alto)
        const maxPrice = Math.max(...products.map((p: any) => p.price || 0));
        const result = products.map((p: any) => ({
            ...p,
            score: maxPrice > 0
                ? Math.round((1 - (p.price || 0) / maxPrice) * 100)
                : 0
        }));

        // ordina dal punteggio più alto
        result.sort((a: any, b: any) => b.score - a.score);
        res.send(result);

    } catch (err) {
        res.status(500).send("Errore confronto: " + err);
    } finally {
        client.close();
    }
});

// -----------------------------------------------------------------
// CATEGORIE
// -----------------------------------------------------------------

// GET /api/categories
// Restituisce le categorie distinte presenti nel DB
app.get("/api/categories", async function (req, res, next) {
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function () {
        res.status(503).send("Errore di connessione al dbms");
        return;
    });
    const collection = client.db(dbName).collection("products");
    const cmd = collection.distinct("category");
    cmd.then(function (data) { res.send(data); });
    cmd.catch(function (err) { res.status(500).send("Errore query: " + err); });
    cmd.finally(function () { client.close(); });
});

//F. default - risorsa non trovata
app.use("/", function (req, res, next) {
    res.status(404).send("Risorsa non trovata");
});

//G. gestione errori
app.use("/", function (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
    res.status(500).send(err.message);
    console.log("******** ERRORE ********:\n" + err.stack);
});
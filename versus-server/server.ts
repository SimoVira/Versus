//A. import delle librerie
import http from "http";
import express from "express";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import queryStringParser from "./queryStringParser";
import cors from "cors";
import { AiService } from "./AI-service";

//B. configurazioni
const app: express.Express = express();
dotenv.config({ path: ".env" });

const connectionString = process.env.connectionStringLocal;
const dbName = process.env.dbName;
const PORT = parseInt(process.env.PORT!);

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
app.get("/api/products", async function (req, res, next) {
    const filters: any = {};

    if (req.query.category)
        filters.category = req.query.category;

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
app.post("/api/compare", async function (req, res, next) {
    const json: any = req.body;
    const ids: string[] = json.ids;

    if (!ids || ids.length < 2) {
        res.status(400).send({ err: "Seleziona almeno 2 prodotti da confrontare" });
        return;
    }

    // ── A. Recupero prodotti da MongoDB ──────────────────────
    let p1: any, p2: any;
    const mongoClient = new MongoClient(connectionString!);
    try {
        await mongoClient.connect();
        const collection = mongoClient.db(dbName).collection("products");

        p1 = await collection.findOne({ _id: new ObjectId(ids[0]) });
        if (!p1) {
            res.status(404).send({ err: "Prodotto 1 non trovato" });
            return;
        }

        p2 = await collection.findOne({ _id: new ObjectId(ids[1]) });
        if (!p2) {
            res.status(404).send({ err: "Prodotto 2 non trovato" });
            return;
        }

    } catch (err: any) {
        console.error(err);
        res.status(500).send({ err: "Errore durante l'estrazione dei prodotti: " + err.message });
        return;
    } finally {
        await mongoClient.close();
    }

    const aiService = new AiService();
    aiService.compareProducts(p1, p2).then((compareResponse) => {
        res.send(compareResponse);
    }).catch((err: any) => {
        console.error(err);
        res.status(500).send({ err: "Errore durante l'analisi AI: " + err.message });
    });

});

// -----------------------------------------------------------------
// CATEGORIE
// -----------------------------------------------------------------

// GET /api/categories
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



// compareProducts: confronto tra due prodotti
async function compareProducts(req: any, res: any): Promise<void> {



}
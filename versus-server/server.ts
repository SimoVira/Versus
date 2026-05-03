//A. import delle librerie
import http from "http";
import express from "express";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import queryStringParser from "./queryStringParser";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AiService } from "./AI-service";

//B. configurazioni
const app: express.Express = express();
dotenv.config({ path: ".env" });

const connectionString = process.env.connectionStringLocal!;
const dbName = process.env.dbName!;
const JWT_KEY = process.env.JWT_KEY!;
const PORT = parseInt(process.env.PORT!);
const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10;

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
app.use("/", queryStringParser);

//5. Vincoli CORS - accetto richieste da qualunque client (React Native incluso)
const corsOptions = {
    origin: function (origin: any, callback: any) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", cors(corsOptions));

// -----------------------------------------------------------------
// AUTH
// -----------------------------------------------------------------

// POST /api/register
app.post("/api/register", async function (req, res, next) {
    const { name, email, password } = req.body;

    try {
        const client = new MongoClient(connectionString);
        await client.connect();

        const collection = client.db(dbName).collection("users");

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const data = await collection.insertOne({
            name, email,
            password: hashedPassword,
            createdAt: new Date(),
        });

        const token = jwt.sign(
            { userId: data.insertedId.toString(), email },
            JWT_KEY,
            { expiresIn: TOKEN_EXPIRY }
        );

        await client.close();
        res.status(201).send({ token, user: { id: data.insertedId, email, name } });

    } catch (err: any) {
        console.error("ERRORE REGISTER:", err.message);
        res.status(500).send({ err: err.message });
    }
});


// POST /api/login
app.post("/api/login", async function (req, res, next) {
    const { email, password } = req.body;

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });

    const collection = client.db(dbName).collection("users");
    const cmd = collection.findOne({ email });

    cmd.then(async function (user) {
        if (!user) {
            res.status(401).send({ err: "Credenziali non valide" });
            return;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            res.status(401).send({ err: "Credenziali non valide" });
            return;
        }

        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email }, // payload
            JWT_KEY,
            { expiresIn: TOKEN_EXPIRY }
        );

        res.status(200).send({
            token,
            user: { id: user._id, email: user.email, name: user.name }
        });
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
    cmd.finally(function () { client.close(); });
});

// MIDDLEWARE — verifica JWT per tutte le route /api/*
app.use("/api", function (req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).send({ err: "Token mancante o formato non valido" });
        return;
    }

    const token: any = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, JWT_KEY);
        (req as any).user = payload; // aggiungo il payload del token (dati dell'utente loggato) alla request per ogni route protetta
        next();
    } catch (err) {
        res.status(401).send({ err: "Token non valido o scaduto" });
    }
});

//E. gestione delle risorse dinamiche



// -----------------------------------------------------------------
// CATEGORIE
// -----------------------------------------------------------------

// GET /api/categories
app.get("/api/categories", async function (req, res, next) {
    const client = new MongoClient(connectionString);
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

    const client = new MongoClient(connectionString);
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

    const client = new MongoClient(connectionString);
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

    const client = new MongoClient(connectionString);
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

    const client = new MongoClient(connectionString);
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
    const client = new MongoClient(connectionString);
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
// PREFERITI
// -----------------------------------------------------------------

// POST /api/favorites/:productId  — toggle (aggiunge o rimuove)
app.post("/api/favorites/:productId", async function (req, res, next) {
    const userId = (req as any).user.userId;   // dal token JWT
    const productId = req.params.productId;

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });

    const collection = client.db(dbName).collection("users");

    // Controlla se è già nei preferiti
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
        await client.close();
        res.status(404).send({ err: "Utente non trovato" });
        return;
    }

    const favorites: string[] = user.favorites ?? [];
    const alreadyFavorite = favorites.includes(productId);

    // Toggle: $pull se esiste, $addToSet se non esiste
    const update: any = alreadyFavorite
        ? { $pull: { favorites: productId } }
        : { $addToSet: { favorites: productId } };

    const cmd = collection.updateOne({ _id: new ObjectId(userId) }, update);
    cmd.then(function () {
        const updated = alreadyFavorite
            ? favorites.filter((id) => id !== productId)
            : [...favorites, productId];
        res.status(200).send({ favorites: updated, isFavorite: !alreadyFavorite });
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore aggiornamento: " + err }); });
    cmd.finally(function () { client.close(); });
});

// GET /api/favorites  — restituisce i prodotti preferiti completi
app.get("/api/favorites", async function (req, res, next) {
    const userId = (req as any).user.userId;

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });

    const db_ref = client.db(dbName);
    const collectionUsers = db_ref.collection("users");
    const collectionProducts = db_ref.collection("products");

    const user = await collectionUsers.findOne({ _id: new ObjectId(userId) });
    if (!user || !user.favorites || user.favorites.length === 0) {
        await client.close();
        res.status(200).send([]);
        return;
    }

    const objectIds = user.favorites.map((id: string) => new ObjectId(id));
    const cmd = collectionProducts.find({ _id: { $in: objectIds } }).toArray();
    cmd.then(function (data) { res.status(200).send(data); });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
    cmd.finally(function () { client.close(); });
});

// GET /api/favorites/check/:productId  — controlla se è nei preferiti
app.get("/api/favorites/check/:productId", async function (req, res, next) {
    const userId = (req as any).user.userId;
    const productId = req.params.productId;

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });

    const users = client.db(dbName).collection("users");
    const cmd = users.findOne(
        { _id: new ObjectId(userId) },
        { projection: { favorites: 1 } }
    );
    cmd.then(function (user) {
        const isFavorite = user?.favorites?.includes(productId) ?? false;
        res.status(200).send({ isFavorite });
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
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

    // ── Recupero prodotti da MongoDB ─────────────────────────
    let p1: any, p2: any;
    const mongoClient = new MongoClient(connectionString);
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
    aiService.compareProducts(p1, p2).then(async (compareResponse) => {
        res.send(compareResponse);

        // Salva storico in background (non blocca la risposta)
        const userId = (req as any).user.userId;
        const hClient = new MongoClient(connectionString);
        try {
            await hClient.connect();
            await hClient.db(dbName).collection("comparisons").insertOne({
                userId,
                compareResponse, 
                createdAt: new Date(),
            });
        } catch (e: any) {
            console.error("Errore salvataggio storico:", e.message);
        } finally {
            await hClient.close();
        }
    }).catch((err: any) => {
        console.error(err);
        res.status(500).send({ err: "Errore durante l'analisi AI: " + err.message });
    });
});

// GET /api/history
app.get("/api/history", async function (req, res, next) {
    const userId = (req as any).user.userId;

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });

    const collection = client.db(dbName).collection("comparisons");
    const cmd = collection.find({ userId }).sort({ createdAt: -1 }).toArray();
    cmd.then(function (data) { res.status(200).send(data); });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
    cmd.finally(function () { client.close(); });
});

// GET /api/history/:id — singolo confronto (per aprirlo da storico dei confronti)
app.get("/api/history/:id", async function (req, res, next) {
    const userId = (req as any).user.userId;
    const _id = new ObjectId(req.params.id);

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });

    const collection = client.db(dbName).collection("comparisons");
    const cmd = collection.findOne({ _id, userId });
    cmd.then(function (data) {
        if (!data) { res.status(404).send({ err: "Confronto non trovato" }); return; }
        res.status(200).send(data);
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
    cmd.finally(function () { client.close(); });
});

// DELETE /api/history/:id
app.delete("/api/history/:id", async function (req, res, next) {
    const userId = (req as any).user.userId;
    const _id = new ObjectId(req.params.id);

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });

    const collection = client.db(dbName).collection("comparisons");
    const cmd = collection.deleteOne({ _id, userId });
    cmd.then(function (data) {
        if (data.deletedCount === 0) { res.status(404).send({ err: "Confronto non trovato" }); return; }
        res.status(200).send({ deleted: true });
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore eliminazione: " + err }); });
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
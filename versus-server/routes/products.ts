import { Router } from "express";
import { MongoClient, ObjectId } from "mongodb";
import { connectionString, dbName, aiService } from "../config";

const router = Router();

// GET /api/products
router.get("/", async function (req, res) {
    const filters: any = {};
    if (req.query.category) filters.category = req.query.category;
    if (req.query.search) filters.name = { $regex: req.query.search, $options: "i" };
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
router.get("/:id", async function (req, res) {
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

// PATCH /api/products/:id/refresh-price
router.patch("/:id/refresh-price", async function (req, res) {
    const id = req.params.id;
    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });
    const collection = client.db(dbName).collection("products");
    const cmd1 = collection.findOne({ _id: new ObjectId(id) });
    cmd1.then(async function (product) {
        if (!product) { res.status(404).send({ error: "Prodotto non trovato" }); return; }
        const priceRefreshResult = await aiService.refreshProductPrice(product.searchQuery);
        if (priceRefreshResult.price == null) {
            res.status(200).send({ price: product.price, source: "prezzo precedente, aggiornamento fallito" });
            client.close();
            return;
        }
        const now = new Date();
        const newPrice = {
            price: priceRefreshResult.price,
            date: now.toISOString().split("T")[0],
            source: priceRefreshResult.source ?? "gemini-grounding",
        };
        const cmd2 = collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { price: priceRefreshResult.price, lastUpdate: now }, $push: { priceHistory: newPrice } as any }
        );
        cmd2.then(function () {
            res.status(200).send({ price: priceRefreshResult.price, source: priceRefreshResult.source ?? "gemini-grounding", addedPriceHistory: newPrice });
        });
        cmd2.catch(function (err: any) { console.error("Errore aggiornamento MongoDB:", err); });
        cmd2.finally(function () { client.close(); });
    });
    cmd1.catch(function (err) { res.status(500).send({ error: "Errore interno del server" }); });
});

export default router;
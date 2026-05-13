import { Router } from "express";
import { MongoClient } from "mongodb";
import { connectionString, dbName } from "../config";

const router = Router();

// GET /api/categories
router.get("/", async function (req, res) {
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

export default router;
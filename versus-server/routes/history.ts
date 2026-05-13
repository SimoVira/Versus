import { Router } from "express";
import { MongoClient, ObjectId } from "mongodb";
import { connectionString, dbName } from "../config";

const router = Router();

// GET /api/history
router.get("/", async function (req, res) {
    const userId = (req as any).user.userId;
    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });
    const cmd = client.db(dbName).collection("comparisons").find({ userId }).sort({ createdAt: -1 }).toArray();
    cmd.then(function (data) { res.status(200).send(data); });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
    cmd.finally(function () { client.close(); });
});

// GET /api/history/:id
router.get("/:id", async function (req, res) {
    const userId = (req as any).user.userId;
    const _id = new ObjectId(req.params.id);
    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });
    const cmd = client.db(dbName).collection("comparisons").findOne({ _id, userId });
    cmd.then(function (data) {
        if (!data) { res.status(404).send({ err: "Confronto non trovato" }); return; }
        res.status(200).send(data);
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
    cmd.finally(function () { client.close(); });
});

// DELETE /api/history/:id
router.delete("/:id", async function (req, res) {
    const userId = (req as any).user.userId;
    const _id = new ObjectId(req.params.id);
    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });
    const cmd = client.db(dbName).collection("comparisons").deleteOne({ _id, userId });
    cmd.then(function (data) {
        if (data.deletedCount === 0) { res.status(404).send({ err: "Confronto non trovato" }); return; }
        res.status(200).send({ deleted: true });
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore eliminazione: " + err }); });
    cmd.finally(function () { client.close(); });
});

export default router;
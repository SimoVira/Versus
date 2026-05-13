import { Router } from "express";
import { MongoClient, ObjectId } from "mongodb";
import { connectionString, dbName } from "../config";

const router = Router();

// GET /api/favorites
router.get("/", async function (req, res) {
    const userId = (req as any).user.userId;
    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });
    const db_ref = client.db(dbName);
    const user = await db_ref.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user || !user.favorites || user.favorites.length === 0) {
        await client.close();
        res.status(200).send([]);
        return;
    }
    const objectIds = user.favorites.map((id: string) => new ObjectId(id));
    const cmd = db_ref.collection("products").find({ _id: { $in: objectIds } }).toArray();
    cmd.then(function (data) { res.status(200).send(data); });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
    cmd.finally(function () { client.close(); });
});

// GET /api/favorites/check/:productId
router.get("/check/:productId", async function (req, res) {
    const userId = (req as any).user.userId;
    const productId = req.params.productId;
    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });
    const cmd = client.db(dbName).collection("users").findOne(
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

// POST /api/favorites/:productId
router.post("/:productId", async function (req, res) {
    const userId = (req as any).user.userId;
    const productId = req.params.productId;
    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });
    const collection = client.db(dbName).collection("users");
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) { await client.close(); res.status(404).send({ err: "Utente non trovato" }); return; }
    const favorites: string[] = user.favorites ?? [];
    const alreadyFavorite = favorites.includes(productId);
    const update: any = alreadyFavorite
        ? { $pull: { favorites: productId } }
        : { $addToSet: { favorites: productId } };
    const cmd = collection.updateOne({ _id: new ObjectId(userId) }, update);
    cmd.then(function () {
        const updated = alreadyFavorite ? favorites.filter(id => id !== productId) : [...favorites, productId];
        res.status(200).send({ favorites: updated, isFavorite: !alreadyFavorite });
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore aggiornamento: " + err }); });
    cmd.finally(function () { client.close(); });
});

export default router;
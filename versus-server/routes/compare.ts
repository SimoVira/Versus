import { Router } from "express";
import { MongoClient, ObjectId } from "mongodb";
import { connectionString, dbName, aiService } from "../config";

const router = Router();

// POST /api/compare
router.post("/", async function (req, res) {
    const ids: string[] = req.body.ids;
    let p1: any, p2: any;
    const mongoClient = new MongoClient(connectionString);
    try {
        await mongoClient.connect();
        const collection = mongoClient.db(dbName).collection("products");
        p1 = await collection.findOne({ _id: new ObjectId(ids[0]) });
        if (!p1) { res.status(404).send({ err: "Prodotto 1 non trovato" }); return; }
        p2 = await collection.findOne({ _id: new ObjectId(ids[1]) });
        if (!p2) { res.status(404).send({ err: "Prodotto 2 non trovato" }); return; }
    } catch (err: any) {
        res.status(500).send({ err: "Errore durante l'estrazione dei prodotti: " + err.message });
        return;
    } finally {
        await mongoClient.close();
    }

    aiService.compareProducts(p1, p2).then(async (compareResponse) => {
        res.send(compareResponse);
        const userId = (req as any).user.userId;
        const hClient = new MongoClient(connectionString);
        try {
            await hClient.connect();
            await hClient.db(dbName).collection("comparisons").insertOne({ userId, compareResponse, createdAt: new Date() });
        } catch (e: any) {
            console.error("Errore salvataggio storico:", e.message);
        } finally {
            await hClient.close();
        }
    }).catch((err: any) => {
        res.status(500).send({ err: "Errore durante l'analisi AI: " + err.message });
    });
});

export default router;
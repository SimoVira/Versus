import { Router } from "express";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectionString, dbName, JWT_KEY, TOKEN_EXPIRY, SALT_ROUNDS } from "../config";

const router = Router();

// POST /api/register
router.post("/register", async function (req, res) {
    const { name, email, password } = req.body;
    try {
        const client = new MongoClient(connectionString);
        await client.connect();
        const collection = client.db(dbName).collection("users");
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const data = await collection.insertOne({ name, email, password: hashedPassword, createdAt: new Date() });
        const token = jwt.sign({ userId: data.insertedId.toString(), email }, JWT_KEY, { expiresIn: TOKEN_EXPIRY });
        await client.close();
        res.status(201).send({ token, user: { id: data.insertedId, email, name } });
    } catch (err: any) {
        console.error("ERRORE REGISTER:", err.message);
        res.status(500).send({ err: err.message });
    }
});

// POST /api/login
router.post("/login", async function (req, res) {
    const { email, password } = req.body;
    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });
    const collection = client.db(dbName).collection("users");
    const cmd = collection.findOne({ email });
    cmd.then(async function (user) {
        if (!user) { res.status(401).send({ err: "Credenziali non valide" }); return; }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) { res.status(401).send({ err: "Credenziali non valide" }); return; }
        const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_KEY, { expiresIn: TOKEN_EXPIRY });
        res.status(200).send({ token, user: { id: user._id, email: user.email, name: user.name } });
    });
    cmd.catch(function (err: any) { res.status(500).send({ err: "Errore query: " + err }); });
    cmd.finally(function () { client.close(); });
});

export default router;
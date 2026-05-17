import { Router } from "express";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectionString, dbName, JWT_KEY, TOKEN_EXPIRY, SALT_ROUNDS } from "../config";

const router = Router();

// POST /api/register
router.post("/register", async function (req, res) {
    const { name, email, password } = req.body;

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send({ err: "Errore di connessione al dbms" });
        return;
    });

    const collection = client.db(dbName).collection("users");
    const cmd = collection.findOne({ email });

    cmd.then(async function (existingUser) {
        // Caso 1: utente non esiste → registrazione normale
        if (!existingUser) {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            const data = await collection.insertOne({
                name,
                email,
                password: hashedPassword,
                favorites: [],
                createdAt: new Date(),
            });
            const token = jwt.sign(
                { userId: data.insertedId.toString(), email },
                JWT_KEY,
                { expiresIn: TOKEN_EXPIRY }
            );
            res.status(201).send({ token, user: { id: data.insertedId, email, name } });
            return;
        }

        // Caso 2: esiste ma solo con Google (nessuna password) → aggiungo password
        if (!existingUser.password) {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            await collection.updateOne(
                { _id: existingUser._id },
                { $set: { password: hashedPassword, name: existingUser.name ?? name } }
            );
            const token = jwt.sign(
                { userId: existingUser._id.toString(), email },
                JWT_KEY,
                { expiresIn: TOKEN_EXPIRY }
            );
            res.status(200).send({ token, user: { id: existingUser._id, email, name: existingUser.name ?? name } });
            return;
        }

        // Caso 3: esiste già con password → conflitto
        res.status(409).send({ err: "Email già in uso" });
    });

    cmd.catch(function (err: any) {
        res.status(500).send({ err: "Errore query: " + err });
    });

    cmd.finally(function () {
        client.close();
    });
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




// GET /api/google/start?state=xxx
router.get("/google/start", async function (req, res) {
    const state = req.query.state as string;
    if (!state) { res.status(400).send("state mancante"); return; }

    const client = new MongoClient(connectionString);
    await client.connect().catch(function () {
        res.status(503).send("Errore connessione db"); return;
    });
    const cmd = client.db(dbName).collection("oauth_sessions").insertOne({
        state,
        status: "pending",
        createdAt: new Date(),
    });
    cmd.then(function () {
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_WEB_CLIENT_ID!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            response_type: "code",
            scope: "openid email profile",
            state,
        });
        res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    });
    cmd.catch(function (err: any) { res.status(500).send("Errore: " + err); });
    cmd.finally(function () { client.close(); });
});



// GET /api/google/callback
router.get("/google/callback", async function (req, res) {
    const { code, state } = req.query as { code: string; state: string };
    if (!code || !state) { res.status(400).send("Parametri mancanti"); return; }

    try {
        // Scambia code → access token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_WEB_CLIENT_ID!,
                client_secret: process.env.GOOGLE_WEB_CLIENT_SECRET!,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
                grant_type: "authorization_code",
            }),
        });
        const tokens = await tokenRes.json();

        // Ottieni profilo Google
        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const googleUser = await userRes.json();
        const { email, name, sub: googleId } = googleUser;

        // Trova o crea utente
        const client = new MongoClient(connectionString);
        await client.connect();
        const users = client.db(dbName).collection("users");
        let user = await users.findOne({ $or: [{ email }, { googleId }] });
        if (!user) {
            const result = await users.insertOne({ name: name ?? email, email, favorites: [], createdAt: new Date(), googleId });
            user = { _id: result.insertedId, name: name ?? email, email };
        } else if (!user.googleId) { // Se l'utente esiste ma non ha googleId (aveva un account senza Google), aggiorna il record
            await users.updateOne({ _id: user._id }, { $set: { googleId } });
        }

        // Crea JWT e salva su MongoDB
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            JWT_KEY,
            { expiresIn: TOKEN_EXPIRY }
        );
        await client.db(dbName).collection("oauth_sessions").updateOne(
            { state },
            { $set: { status: "done", token, user: { id: user._id, email: user.email, name: user.name } } }
        );
        await client.close();

        res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#fff">
            <h2 style="color:#AAFF00">✓ Accesso effettuato!</h2>
            <p style="color:#888">Puoi chiudere questa finestra e tornare all'app.</p>
            <script>setTimeout(function(){ window.close(); }, 1500);</script>
        </body></html>`);
    } catch (err: any) {
        res.status(500).send("Errore: " + err.message);
    }
});



// GET /api/google/status?state=xxx
router.get("/google/status", async function (req, res) {
    const state = req.query.state as string;
    if (!state) { res.status(400).send("state mancante"); return; }

    const client = new MongoClient(connectionString);
    try {
        await client.connect();
        const collection = client.db(dbName).collection("oauth_sessions");
        const session = await collection.findOne({ state });

        if (!session) {
            res.status(404).send({ status: "not_found" });
            return;
        }
        if (session.status == "done") {
            await collection.deleteOne({ state });
            res.status(200).send({ status: "done", token: session.token, user: session.user });
        } else {
            res.status(200).send({ status: "pending" });
        }
    } catch (err: any) {
        res.status(500).send({ status: "error", err: String(err) });
    } finally {
        await client.close();
    }
});

export default router;
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

// Mappa in memoria per le sessioni OAuth temporanee
const oauthSessions = new Map<string, {
    status: "pending" | "done";
    token?: string;
    user?: any;
    createdAt: Date;
}>();

// Pulisce sessioni vecchie ogni minuto
setInterval(function () {
    const limit = new Date(Date.now() - 5 * 60 * 1000);
    oauthSessions.forEach(function (val, key) {
        if (val.createdAt < limit) oauthSessions.delete(key);
    });
}, 60_000);

// GET /api/google/start?state=xxx
router.get("/google/start", function (req, res) {
    const state = req.query.state as string;
    if (!state) { res.status(400).send("state mancante"); return; }

    oauthSessions.set(state, { status: "pending", createdAt: new Date() });

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_WEB_CLIENT_ID!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        response_type: "code",
        scope: "openid email profile",
        state,
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/google/callback  ← Google redirige qui
router.get("/google/callback", async function (req, res) {
    const { code, state } = req.query as { code: string; state: string };
    if (!code || !state || !oauthSessions.has(state)) {
        res.status(400).send("Parametri non validi"); return;
    }

    try {
        // 1. Scambia code → access token
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

        // 2. Ottieni profilo utente
        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const googleUser = await userRes.json();
        const { email, name, sub: googleId } = googleUser;

        // 3. Trova o crea utente in MongoDB
        const client = new MongoClient(connectionString);
        await client.connect();
        const collection = client.db(dbName).collection("users");
        let user = await collection.findOne({ $or: [{ email }, { googleId }] });
        if (!user) {
            const result = await collection.insertOne({ name: name ?? email, email, googleId, createdAt: new Date() });
            user = { _id: result.insertedId, name: name ?? email, email };
        } else if (!user.googleId) {
            await collection.updateOne({ _id: user._id }, { $set: { googleId } });
        }
        await client.close();

        // 4. Crea JWT e salva in sessione
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            JWT_KEY,
            { expiresIn: TOKEN_EXPIRY }
        );
        oauthSessions.set(state, {
            status: "done",
            token,
            user: { id: user._id, email: user.email, name: user.name },
            createdAt: new Date(),
        });

        // 5. Pagina di successo (si chiude da sola)
        res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#fff">
            <h2 style="color:#AAFF00">✓ Accesso effettuato!</h2>
            <p style="color:#888">Puoi chiudere questa finestra e tornare all'app.</p>
            <script>setTimeout(function(){ window.close(); }, 1500);</script>
        </body></html>`);
    } catch (err: any) {
        oauthSessions.delete(state);
        res.status(500).send("Errore: " + err.message);
    }
});

// GET /api/google/status?state=xxx  ← app fa polling qui
router.get("/google/status", function (req, res) {
    const state = req.query.state as string;
    const session = oauthSessions.get(state);
    if (!session) { res.status(404).send({ status: "not_found" }); return; }
    if (session.status === "done") {
        oauthSessions.delete(state);
        res.status(200).send({ status: "done", token: session.token, user: session.user });
    } else {
        res.status(200).send({ status: "pending" });
    }
});

export default router;
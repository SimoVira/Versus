//A. import delle librerie
import http from "http";
import express from "express";
import queryStringParser from "./queryStringParser";
import cors from "cors";

//B. configurazioni
const app: express.Express = express();
const PORT = parseInt(process.env.PORT!);

//C. creazione ed avvio del server HTTP
const server = http.createServer(app);
server.listen(PORT, function () {
    console.log("Versus server in ascolto sulla porta " + PORT);
});

//D. middleware
app.use("/", function (req, res, next) {
    console.log(req.method + ": " + req.originalUrl);
    next();
});
app.use("/", express.json({ limit: "5mb" }));
app.use("/", function (req, res, next) {
    if (req.body && Object.keys(req.body).length > 0)
        console.log("      parametri body: " + JSON.stringify(req.body));
    else if (req.query && Object.keys(req.query).length > 0)
        console.log("      parametri query: " + JSON.stringify(req.query));
    next();
});
app.use("/", queryStringParser);
const corsOptions = {
    origin: function (origin: any, callback: any) { return callback(null, true); },
    credentials: true
};
app.use("/", cors(corsOptions));

//E. route
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import favoriteRoutes from "./routes/favorites";
import historyRoutes from "./routes/history";
import compareRoutes from "./routes/compare";
import { jwtMiddleware } from "./middleware/auth";

app.use("/api", authRoutes);           // login e register → NO JWT
app.use("/api", jwtMiddleware);        // da qui in poi serve il token
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/compare", compareRoutes);

//F. default - risorsa non trovata
app.use("/", function (req, res, next) {
    res.status(404).send("Risorsa non trovata");
});

//G. gestione errori
app.use("/", function (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
    res.status(500).send(err.message);
    console.log("******** ERRORE ********:\n" + err.stack);
});
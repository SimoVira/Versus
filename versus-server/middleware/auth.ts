import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_KEY } from "../config";

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).send({ err: "Token mancante o formato non valido" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, JWT_KEY);
        (req as any).user = payload;
        next();
    } catch {
        res.status(401).send({ err: "Token non valido o scaduto" });
    }
}
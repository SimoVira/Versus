import { inviaRichiesta } from "./libreria";
import { CompareResponse } from "../types/Product";

export interface CompareHistory {
    _id: string;
    userId: string;
    compareResponse: CompareResponse;
    createdAt: string;
}

export class HistoryService {

    // Lista completa storico
    public async getHistory(): Promise<CompareHistory[]> {
        const res = await inviaRichiesta("GET", "/history", {});
        if (res?.status === 200) return res.data;
        throw new Error(res?.data?.err || "Errore nel recupero dello storico");
    }

    // Singolo confronto per ID — usato da compare.tsx in modalità storico
    public async getHistoryById(id: string): Promise<CompareHistory> {
        const res = await inviaRichiesta("GET", `/history/${id}`, {});
        if (res?.status === 200) return res.data;
        throw new Error(res?.data?.err || "Confronto non trovato");
    }

    // Elimina un confronto
    public async deleteHistory(id: string): Promise<void> {
        const res = await inviaRichiesta("DELETE", `/history/${id}`, {});
        if (res?.status === 200) return;
        throw new Error(res?.data?.err || "Errore nell'eliminazione");
    }
}
import { inviaRichiesta } from "./libreria";

export interface CompareHistory {
    _id:       string;
    userId:    string;
    createdAt: string;
    products:  any[];
    analysis:  {
        score1:  number;
        score2:  number;
        pros1:   string[];
        pros2:   string[];
        cons1:   string[];
        cons2:   string[];
        winner:  1 | 2;
        verdict: string;
    };
}

export class HistoryService {

    public async getHistory(): Promise<CompareHistory[]> {
        const res = await inviaRichiesta("GET", "/history", {});
        if (res?.status === 200) return res.data;
        throw new Error(res?.data?.err || "Errore nel recupero dello storico");
    }

    public async deleteHistory(id: string): Promise<void> {
        const res = await inviaRichiesta("DELETE", `/history/${id}`, {});
        if (res?.status === 200) return;
        throw new Error(res?.data?.err || "Errore nell'eliminazione");
    }
}
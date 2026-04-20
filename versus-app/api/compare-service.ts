import { inviaRichiesta } from "./client";
import { CompareResponse } from "../types/Product";

export class CompareService {
    public async compareProducts(ids: string[]): Promise<CompareResponse> {
        if (ids.length < 2) throw new Error("Seleziona almeno 2 prodotti da confrontare");

        const res = await inviaRichiesta("POST", "/compare", { ids });
        if (res?.status === 200) return res.data;   // CompareResponse: { products, geminiAnalysis }
        throw new Error(res?.err || "Errore nel confronto dei prodotti");
    }
}
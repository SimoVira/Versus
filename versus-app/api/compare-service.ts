import { inviaRichiesta } from "./libreria";
import { CompareResponse } from "../types/Product";

function getErrorMessage(res: any, fallback: string): string {
    const detail = res?.err || res?.data?.err;
    return detail ? `${fallback}: ${detail}` : fallback;
}

export class CompareService {
    public async compareProducts(ids: string[]): Promise<CompareResponse> {
        if (ids.length < 2) throw new Error("Seleziona almeno 2 prodotti da confrontare");

        const res = await inviaRichiesta("POST", "/compare", { ids });
        if (res?.status === 200) return res.data;   // CompareResponse: { products, geminiAnalysis }
        throw new Error(getErrorMessage(res, "Errore nel confronto dei prodotti"));
    }
}

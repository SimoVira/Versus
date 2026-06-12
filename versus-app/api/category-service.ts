import { inviaRichiesta } from "./libreria";
import { TechCategory } from "../types/Product";

function getErrorMessage(res: any, fallback: string): string {
    const detail = res?.err || res?.data?.err;
    return detail ? `${fallback}: ${detail}` : fallback;
}

export class CategoryService {
    public async getCategories(): Promise<TechCategory[]> {
        const res = await inviaRichiesta("GET", "/categories");
        if (res?.status === 200) return res.data;
        throw new Error(getErrorMessage(res, "Errore nel recupero delle categorie"));
    }
}

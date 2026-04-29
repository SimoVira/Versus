import { inviaRichiesta } from "./libreria";
import { TechCategory } from "../types/Product";

export class CategoryService {
    public async getCategories(): Promise<TechCategory[]> {
        const res = await inviaRichiesta("GET", "/categories");
        if (res?.status === 200) return res.data;
        throw new Error(res?.err || "Errore nel recupero delle categorie");
    }
}
import { inviaRichiesta } from "./client";
import { Product } from "../types/Product";

export class ProductService {
    public async getProducts(category?: string, search?: string): Promise<Product[]> {
        const params: any = {};
        if (category) params.category = category;
        if (search) params.search = search;

        const res = await inviaRichiesta("GET", "/products", params);
        if (res?.status === 200) return res.data;
        throw new Error(res?.err || "Errore nel recupero dei prodotti");
    }

    public async getProductById(id: string): Promise<Product> {
        const res = await inviaRichiesta("GET", `/products/${id}`);
        if (res?.status === 200) return res.data;
        throw new Error(res?.err || "Prodotto non trovato");
    }

    public async addProduct(product: Omit<Product, "_id">): Promise<void> {
        const res = await inviaRichiesta("POST", "/products", product);
        if (res?.status !== 200) throw new Error(res?.err || "Errore inserimento prodotto");
    }

    public async updateProduct(id: string, fields: Partial<Product>): Promise<void> {
        const res = await inviaRichiesta("PATCH", `/products/${id}`, fields);
        if (res?.status !== 200) throw new Error(res?.err || "Errore aggiornamento prodotto");
    }

    public async deleteProduct(id: string): Promise<void> {
        const res = await inviaRichiesta("DELETE", `/products/${id}`);
        if (res?.status !== 200) throw new Error(res?.err || "Errore eliminazione prodotto");
    }
}
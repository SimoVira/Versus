import { inviaRichiesta } from "./libreria";
import { PriceRefreshResponse, Product } from "../types/Product";

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
    async refreshPrice(productId: string): Promise<PriceRefreshResponse> {
    // usa il tuo client HTTP (libreria.js) con PATCH /api/products/:id/refresh-price
     const res = await inviaRichiesta("PATCH", `/products/${productId}/refresh-price`);
     if (res?.status != 200) throw new Error(res?.err || "Errore nel refresh del prezzo");
     return res.data;
    }
}
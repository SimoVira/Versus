// api/favorites-service.ts  —  lato CLIENT
import { inviaRichiesta } from "./libreria";
import { Product } from "../types/Product";

function getErrorMessage(res: any, fallback: string): string {
    const detail = res?.err || res?.data?.err;
    return detail ? `${fallback}: ${detail}` : fallback;
}

export class FavoritesService {

    // Aggiunge o rimuove dai preferiti (toggle)
    public async updateFavorites(productId: string): Promise<{ favorites: string[] }> {
        const res = await inviaRichiesta("POST", `/favorites/${productId}`, {});
        if (res?.status === 200) return res.data;
        throw new Error(getErrorMessage(res, "Errore durante l'aggiornamento dei preferiti"));
    }

    // Recupera i prodotti preferiti completi
    public async getFavorites(): Promise<Product[]> {
        const res = await inviaRichiesta("GET", "/favorites", {});
        if (res?.status === 200) return res.data;
        throw new Error(getErrorMessage(res, "Errore nel recupero dei preferiti"));
    }

    // Controlla se un prodotto è nei preferiti
    public async isFavorite(productId: string): Promise<boolean> {
        const res = await inviaRichiesta("GET", "/favorites/check/" + productId, {});
        if (res?.status === 200) return res.data.isFavorite;
        return false;
    }
}

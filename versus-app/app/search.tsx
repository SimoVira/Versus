import { useEffect, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, TextInput, StatusBar
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ProductService } from "../api/product-service";
import { FavoritesService } from "../api/favorites-service";
import { Product } from "../types/Product";

const C = {
    bg: "#08080F",
    card: "#111118",
    border: "#1C1C2E",
    lime: "#C8F135",
    limeDim: "#8AAF22",
    red: "#FF3B5C",
    textPrimary: "#EEEEF8",
    textSub: "#7070A0",
    textDim: "#3A3A5C",
    inputBg: "#0E0E1A",
};

export default function Search() {
    const router = useRouter();
    const { category } = useLocalSearchParams<{ category: string }>();
    const productService = new ProductService();
    const favoritesService = new FavoritesService();

    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [selected, setSelected] = useState<Product[]>([]);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    useEffect(function () {
        loadProducts();
        loadFavorites();
    }, [category]);

    async function loadProducts() {
        setLoading(true);
        setError("");
        try {
            const data = await productService.getProducts(category, search);
            setProducts(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadFavorites() {
        try {
            const data = await favoritesService.getFavorites();
            setFavorites(new Set(data.map(function (p: Product) { return p._id; })));
        } catch {
            // silenzioso
        }
    }

    async function handleToggleFavorite(productId: string) {
        try {
            await favoritesService.updateFavorites(productId);
            setFavorites(function (prev) {
                const next = new Set(prev);
                if (next.has(productId)) next.delete(productId);
                else next.add(productId);
                return next;
            });
        } catch (err: any) {
            console.error("Errore preferiti:", err.message);
        }
    }

    function toggleSelect(product: Product) {
        setSelected(function (prev) {
            const already = prev.find(function (p) { return p._id === product._id; });
            if (already) return prev.filter(function (p) { return p._id !== product._id; });
            if (prev.length >= 2) return [prev[0], product];
            return [...prev, product];
        });
    }

    function getSelectionIndex(id: string): number {
        return selected.findIndex(function (p) { return p._id === id; });
    }

    function handleCompare() {
        if (selected.length !== 2) return;
        router.push({ pathname: "/compare", params: { id1: selected[0]._id, id2: selected[1]._id } });
    }

    if (loading) return (
        <View style={styles.centered}>
            <StatusBar barStyle="light-content" />
            <ActivityIndicator size="large" color={C.lime} />
        </View>
    );

    if (error) return (
        <View style={styles.centered}>
            <StatusBar barStyle="light-content" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProducts} style={styles.retryBtn}>
                <Text style={styles.retryText}>Riprova</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.title}>{category}</Text>
                    <Text style={styles.hint}>
                        {selected.length === 0 && "Seleziona due prodotti"}
                        {selected.length === 1 && "Seleziona ancora un prodotto"}
                        {selected.length === 2 && "Pronti per il confronto ✦"}
                    </Text>
                </View>
            </View>

            <TextInput
                style={styles.searchInput}
                placeholder="Cerca prodotto..."
                placeholderTextColor={C.textDim}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={loadProducts}
                returnKeyType="search"
            />

            <FlatList
                data={products}
                keyExtractor={function (item) { return item._id; }}
                contentContainerStyle={{ paddingBottom: selected.length > 0 ? 140 : 24 }}
                showsVerticalScrollIndicator={false}
                renderItem={function ({ item }) {
                    const selIndex = getSelectionIndex(item._id);
                    const isSelected = selIndex !== -1;
                    const isFav = favorites.has(item._id);

                    return (
                        <TouchableOpacity
                            style={[styles.card, isSelected && styles.cardSelected]}
                            onPress={function () { toggleSelect(item); }}
                            activeOpacity={0.75}
                        >
                            <View style={styles.cardRow}>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.brand}>{item.brand.toUpperCase()}</Text>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={styles.price}>€ {item.price}</Text>
                                </View>

                                <View style={styles.rightColumn}>
                                    <TouchableOpacity
                                        onPress={function () { handleToggleFavorite(item._id); }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Text style={[styles.heartIcon, isFav && styles.heartActive]}>
                                            {isFav ? "♥" : "♡"}
                                        </Text>
                                    </TouchableOpacity>

                                    {isSelected && (
                                        <View style={styles.selectionBadge}>
                                            <Text style={styles.selectionBadgeText}>{selIndex + 1}</Text>
                                        </View>
                                    )}

                                    <View style={[styles.scoreBadge, isSelected && styles.scoreBadgeSelected]}>
                                        <Text style={styles.scoreText}>{item.commonScore}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>Nessun prodotto trovato</Text>}
            />

            {selected.length > 0 && (
                <View style={styles.compareBar}>
                    <View style={styles.compareSlots}>
                        <View style={[styles.slot, selected[0] && styles.slotFilled]}>
                            {selected[0]
                                ? <><Text style={styles.slotNumber}>①</Text><Text style={styles.slotName} numberOfLines={1}>{selected[0].name}</Text></>
                                : <Text style={styles.slotEmpty}>—</Text>}
                        </View>
                        <Text style={styles.vsText}>VS</Text>
                        <View style={[styles.slot, selected[1] && styles.slotFilled]}>
                            {selected[1]
                                ? <><Text style={styles.slotNumber}>②</Text><Text style={styles.slotName} numberOfLines={1}>{selected[1].name}</Text></>
                                : <Text style={styles.slotEmpty}>—</Text>}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.compareBtn, selected.length < 2 && styles.compareBtnDisabled]}
                        onPress={handleCompare}
                        disabled={selected.length < 2}
                    >
                        <Text style={styles.compareBtnText}>Confronta</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 60 },
    centered: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
    header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
    backBtn: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    backArrow: { color: C.textSub, fontSize: 20 },
    headerText: { flex: 1 },
    title: { fontSize: 26, fontWeight: "900", color: C.textPrimary, textTransform: "capitalize" },
    hint: { fontSize: 12, color: C.textSub, marginTop: 2 },
    searchInput: { backgroundColor: C.inputBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: C.textPrimary, marginBottom: 16 },
    card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 10 },
    cardSelected: { borderColor: C.limeDim, backgroundColor: "#0F1A0A" },
    cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardInfo: { flex: 1 },
    brand: { fontSize: 10, color: C.textSub, letterSpacing: 1.5, marginBottom: 4 },
    name: { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 6 },
    price: { fontSize: 18, fontWeight: "800", color: C.lime },
    rightColumn: { alignItems: "center", gap: 8 },
    heartIcon: { fontSize: 20, color: C.textDim },
    heartActive: { color: C.red },
    selectionBadge: { backgroundColor: C.lime, borderRadius: 50, width: 22, height: 22, justifyContent: "center", alignItems: "center" },
    selectionBadgeText: { color: "#000", fontWeight: "800", fontSize: 11 },
    scoreBadge: { backgroundColor: C.border, borderRadius: 50, width: 50, height: 50, justifyContent: "center", alignItems: "center" },
    scoreBadgeSelected: { backgroundColor: C.limeDim },
    scoreText: { color: C.textPrimary, fontWeight: "800", fontSize: 15 },
    emptyText: { textAlign: "center", color: C.textSub, marginTop: 48, fontSize: 15 },
    errorText: { fontSize: 16, color: C.red, marginBottom: 16, textAlign: "center" },
    retryBtn: { backgroundColor: C.lime, padding: 12, borderRadius: 10 },
    retryText: { color: "#000", fontWeight: "bold" },
    compareBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: C.border, paddingHorizontal: 20, paddingVertical: 16, gap: 12, elevation: 16 },
    compareSlots: { flexDirection: "row", alignItems: "center", gap: 8 },
    slot: { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 10, alignItems: "center", minHeight: 48, justifyContent: "center", borderWidth: 1, borderColor: C.border },
    slotFilled: { backgroundColor: "#0F1A0A", borderColor: C.limeDim },
    slotNumber: { fontSize: 14, color: C.lime },
    slotName: { fontSize: 12, fontWeight: "600", color: C.textPrimary, textAlign: "center" },
    slotEmpty: { fontSize: 20, color: C.textDim },
    vsText: { fontSize: 12, fontWeight: "800", color: C.textDim, letterSpacing: 1 },
    compareBtn: { backgroundColor: C.lime, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
    compareBtnDisabled: { backgroundColor: C.limeDim, opacity: 0.4 },
    compareBtnText: { color: "#000", fontWeight: "800", fontSize: 16 },
});
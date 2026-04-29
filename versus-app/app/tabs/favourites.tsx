import { useEffect, useState, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, StatusBar
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { FavoritesService } from "../../api/favorites-service";
import { Product } from "../../types/Product";

const C = {
    bg:          "#08080F",
    card:        "#111118",
    border:      "#1C1C2E",
    lime:        "#C8F135",
    limeDim:     "#8AAF22",
    red:         "#FF3B5C",
    textPrimary: "#EEEEF8",
    textSub:     "#7070A0",
    textDim:     "#3A3A5C",
};

export default function Favorites() {
    const router = useRouter();
    const favoritesService = new FavoritesService();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState("");

    // Ricarica ogni volta che la tab diventa visibile
    useFocusEffect(
        useCallback(function () {
            loadFavorites();
        }, [])
    );

    async function loadFavorites() {
        setLoading(true);
        setError("");
        try {
            const data = await favoritesService.getFavorites();
            setProducts(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRemove(productId: string) {
        try {
            await favoritesService.updateFavorites(productId);
            setProducts(function (prev) {
                return prev.filter(function (p) { return p._id !== productId; });
            });
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (loading) return (
        <View style={styles.centered}>
            <StatusBar barStyle="light-content" />
            <ActivityIndicator size="large" color={C.lime} />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* ── Header ───────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.title}>Preferiti</Text>
                <Text style={styles.count}>
                    {products.length > 0 ? `${products.length} prodott${products.length === 1 ? "o" : "i"}` : ""}
                </Text>
            </View>

            {/* ── Divisore ─────────────────────────────────── */}
            <View style={styles.sectionLabelRow}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionLabel}>I TUOI PRODOTTI</Text>
                <View style={styles.sectionLine} />
            </View>

            {error !== "" && (
                <Text style={styles.errorText}>{error}</Text>
            )}

            <FlatList
                data={products}
                keyExtractor={function (item) { return item._id; }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>♡</Text>
                        <Text style={styles.emptyTitle}>Nessun preferito</Text>
                        <Text style={styles.emptyText}>
                            Aggiungi prodotti ai preferiti dalla lista categorie
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreBtn}
                            onPress={() => router.push("/")}
                        >
                            <Text style={styles.exploreBtnText}>Esplora categorie →</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={function ({ item }) {
                    return (
                        <View style={styles.card}>
                            <TouchableOpacity
                                style={styles.cardMain}
                                onPress={function () {
                                    router.push({
                                        pathname: "/search",
                                        params: { category: item.category }
                                    });
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={styles.cardInfo}>
                                    <Text style={styles.brand}>{item.brand.toUpperCase()}</Text>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <View style={styles.cardMeta}>
                                        <Text style={styles.price}>€ {item.price}</Text>
                                        <View style={styles.categoryTag}>
                                            <Text style={styles.categoryTagText}>{item.category}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.scoreBadge}>
                                    <Text style={styles.scoreText}>{item.commonScore}</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Bottone rimuovi */}
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={function () { handleRemove(item._id); }}
                            >
                                <Text style={styles.removeBtnText}>♥ Rimuovi</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 60 },
    centered:  { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },

    // Header
    header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
    title:   { fontSize: 36, fontWeight: "900", color: C.lime, letterSpacing: -1 },
    count:   { fontSize: 13, color: C.textSub, marginBottom: 4 },

    // Divisore
    sectionLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    sectionLine:     { flex: 1, height: 1, backgroundColor: C.border },
    sectionLabel:    { color: C.textSub, fontSize: 11, fontWeight: "700", letterSpacing: 2, marginHorizontal: 12 },

    // Card
    card: {
        backgroundColor: C.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 10,
        overflow: "hidden",
    },
    cardMain:  { flexDirection: "row", alignItems: "center", padding: 16 },
    cardInfo:  { flex: 1 },
    brand:     { fontSize: 10, color: C.textSub, letterSpacing: 1.5, marginBottom: 4 },
    name:      { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 8 },
    cardMeta:  { flexDirection: "row", alignItems: "center", gap: 10 },
    price:     { fontSize: 17, fontWeight: "800", color: C.lime },
    categoryTag: {
        backgroundColor: C.border, borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    categoryTagText: { color: C.textSub, fontSize: 10, fontWeight: "600", textTransform: "capitalize" },

    scoreBadge: {
        backgroundColor: C.border, borderRadius: 50,
        width: 48, height: 48, justifyContent: "center", alignItems: "center",
    },
    scoreText: { color: C.textPrimary, fontWeight: "800", fontSize: 14 },

    // Bottone rimuovi
    removeBtn: {
        borderTopWidth: 1, borderTopColor: C.border,
        paddingVertical: 10, alignItems: "center",
    },
    removeBtnText: { color: C.red, fontSize: 13, fontWeight: "600" },

    // Empty state
    emptyContainer: { alignItems: "center", marginTop: 80, gap: 12 },
    emptyIcon:      { fontSize: 56, color: C.textDim },
    emptyTitle:     { fontSize: 20, fontWeight: "700", color: C.textPrimary },
    emptyText:      { fontSize: 14, color: C.textSub, textAlign: "center", lineHeight: 21, paddingHorizontal: 32 },
    exploreBtn:     { marginTop: 8, backgroundColor: C.lime, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
    exploreBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },

    errorText: { color: C.red, fontSize: 13, textAlign: "center", marginBottom: 12 },
});
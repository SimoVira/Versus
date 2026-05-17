import { useEffect, useState, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, StatusBar
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FavoritesService } from "../../api/favorites-service";
import { Product } from "../../types/Product";
import { useTheme } from "../../theme";

export default function Favorites() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const favoritesService = new FavoritesService();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    const s = makeStyles(colors);

    if (loading) return (
        <View style={s.centered}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ActivityIndicator size="large" color={colors.lime} />
        </View>
    );

    return (
        <View style={s.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* ── Header ───────────────────────────────────── */}
            <View style={s.header}>
                <View>
                    <Text style={s.title}>Preferiti</Text>
                    {products.length > 0 && (
                        <Text style={s.count}>
                            {products.length} prodott{products.length === 1 ? "o" : "i"}
                        </Text>
                    )}
                </View>
                <View style={s.headerIcon}>
                    <Ionicons name="heart" size={24} color={colors.red} />
                </View>
            </View>

            {/* ── Divisore ─────────────────────────────────── */}
            <View style={s.sectionLabelRow}>
                <View style={s.sectionLine} />
                <View style={s.sectionLabelInner}>
                    <Ionicons name="bookmark-outline" size={11} color={colors.textSub} />
                    <Text style={s.sectionLabel}>I TUOI PRODOTTI</Text>
                </View>
                <View style={s.sectionLine} />
            </View>

            {error !== "" && (
                <View style={s.errorRow}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
                    <Text style={s.errorText}>{error}</Text>
                </View>
            )}

            <FlatList
                data={products}
                keyExtractor={function (item) { return item._id; }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                    <View style={s.emptyContainer}>
                        <Ionicons name="heart-dislike-outline" size={64} color={colors.textDim} />
                        <Text style={s.emptyTitle}>Nessun preferito</Text>
                        <Text style={s.emptyText}>
                            Aggiungi prodotti ai preferiti dalla lista categorie
                        </Text>
                            <TouchableOpacity
                            style={s.exploreBtn}
                            onPress={() => router.push("/tabs/")}
                            activeOpacity={0.85}
                        >
                            <Text style={s.exploreBtnText}>Esplora categorie</Text>
                            <Ionicons name="arrow-forward" size={15} color={colors.textInverse} />
                        </TouchableOpacity>
                    </View>
                }
                renderItem={function ({ item }) {
                    return (
                        <View style={s.card}>
                            <TouchableOpacity
                                style={s.cardMain}
                                onPress={function () {
                                    router.push({
                                        pathname: "/products/[id]",
                                        params: { id: item._id }
                                    });
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={s.cardInfo}>
                                    <Text style={s.brand}>{item.brand.toUpperCase()}</Text>
                                    <Text style={s.name}>{item.name}</Text>
                                    <View style={s.cardMeta}>
                                        <Text style={s.price}>€ {item.price}</Text>
                                        <View style={s.categoryTag}>
                                            <Text style={s.categoryTagText}>{item.category}</Text>
                                        </View>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                            </TouchableOpacity>

                            {/* Bottone rimuovi */}
                            <TouchableOpacity
                                style={s.removeBtn}
                                onPress={function () { handleRemove(item._id); }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="heart-dislike-outline" size={15} color={colors.red} />
                                <Text style={s.removeBtnText}>Rimuovi dai preferiti</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
            />
        </View>
    );
}

function makeStyles(C: ReturnType<typeof useTheme>["colors"]) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 60 },
        centered: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },

        header: {
            flexDirection: "row", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 24,
        },
        title: { fontSize: 36, fontWeight: "900", color: C.lime, letterSpacing: -1 },
        count: { fontSize: 13, color: C.textSub, marginTop: 3, fontWeight: "500" },
        headerIcon: {
            backgroundColor: C.redFaint, borderRadius: 14,
            borderWidth: 1, borderColor: C.border,
            width: 46, height: 46, justifyContent: "center", alignItems: "center",
        },

        sectionLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
        sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
        sectionLabelInner: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 12 },
        sectionLabel: { color: C.textSub, fontSize: 11, fontWeight: "700", letterSpacing: 2 },

        errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
        errorText: { color: C.red, fontSize: 13 },

        card: {
            backgroundColor: C.card, borderRadius: 16,
            borderWidth: 1, borderColor: C.border,
            marginBottom: 10, overflow: "hidden",
        },
        cardMain: { flexDirection: "row", alignItems: "center", padding: 16 },
        cardInfo: { flex: 1 },
        brand: { fontSize: 11, color: C.textSub, letterSpacing: 1.5, marginBottom: 4, fontWeight: "600" },
        name: { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 8, lineHeight: 22 },
        cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
        price: { fontSize: 18, fontWeight: "800", color: C.lime },
        categoryTag: { backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
        categoryTagText: { color: C.textSub, fontSize: 10, fontWeight: "600", textTransform: "capitalize" },

        removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 11 },
        removeBtnText: { color: C.red, fontSize: 13, fontWeight: "600" },

        emptyContainer: { alignItems: "center", marginTop: 80, gap: 14 },
        emptyTitle: { fontSize: 20, fontWeight: "700", color: C.textPrimary },
        emptyText: { fontSize: 14, color: C.textSub, textAlign: "center", lineHeight: 21, paddingHorizontal: 32 },
        exploreBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: C.lime, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
        exploreBtnText: { color: C.textInverse, fontWeight: "700", fontSize: 14 },
    });
}

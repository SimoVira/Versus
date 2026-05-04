import { useEffect, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, TextInput, StatusBar
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ProductService } from "../api/product-service";
import { FavoritesService } from "../api/favorites-service";
import { Product } from "../types/Product";
import { useTheme } from "../theme";

export default function Search() {
    const router = useRouter();
    const { category } = useLocalSearchParams<{ category: string }>();
    const { colors, isDark } = useTheme();
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
        } catch { /* silenzioso */ }
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

    const s = makeStyles(colors);

    if (loading) return (
        <View style={s.centered}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ActivityIndicator size="large" color={colors.lime} />
        </View>
    );

    if (error) return (
        <View style={s.centered}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProducts} style={s.retryBtn}>
                <Text style={s.retryText}>Riprova</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={s.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Text style={s.backArrow}>←</Text>
                </TouchableOpacity>
                <View style={s.headerText}>
                    <Text style={s.title}>{category}</Text>
                    <Text style={s.hint}>
                        {selected.length === 0 && "Seleziona due prodotti"}
                        {selected.length === 1 && "Seleziona ancora un prodotto"}
                        {selected.length === 2 && "Pronti per il confronto ✦"}
                    </Text>
                </View>
            </View>

            <TextInput
                style={s.searchInput}
                placeholder="Cerca prodotto..."
                placeholderTextColor={colors.textDim}
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
                            style={[s.card, isSelected && s.cardSelected]}
                            onPress={function () { toggleSelect(item); }}
                            activeOpacity={0.75}
                        >
                            <View style={s.cardRow}>
                                <View style={s.cardInfo}>
                                    <Text style={s.brand}>{item.brand.toUpperCase()}</Text>
                                    <Text style={s.name}>{item.name}</Text>
                                    <Text style={s.price}>€ {item.price}</Text>
                                </View>

                                <View style={s.rightColumn}>

                                    {/* ⓘ — dettaglio prodotto */}
                                    <TouchableOpacity
                                        style={s.infoBtn}
                                        onPress={function () {
                                            router.push({
                                                pathname: "/products/[id]",
                                                params: { id: item._id }
                                            });
                                        }}
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    >
                                        <Text style={s.infoBtnText}>ⓘ</Text>
                                    </TouchableOpacity>

                                    {/* ♥ — preferiti */}
                                    <TouchableOpacity
                                        onPress={function () { handleToggleFavorite(item._id); }}
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    >
                                        <Text style={[s.heartIcon, isFav && s.heartActive]}>
                                            {isFav ? "♥" : "♡"}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Badge selezione */}
                                    {isSelected && (
                                        <View style={s.selectionBadge}>
                                            <Text style={s.selectionBadgeText}>{selIndex + 1}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={<Text style={s.emptyText}>Nessun prodotto trovato</Text>}
            />

            {selected.length > 0 && (
                <View style={s.compareBar}>
                    <View style={s.compareSlots}>
                        <View style={[s.slot, selected[0] && s.slotFilled]}>
                            {selected[0]
                                ? <><Text style={s.slotNumber}>①</Text><Text style={s.slotName} numberOfLines={1}>{selected[0].name}</Text></>
                                : <Text style={s.slotEmpty}>—</Text>}
                        </View>
                        <Text style={s.vsText}>VS</Text>
                        <View style={[s.slot, selected[1] && s.slotFilled]}>
                            {selected[1]
                                ? <><Text style={s.slotNumber}>②</Text><Text style={s.slotName} numberOfLines={1}>{selected[1].name}</Text></>
                                : <Text style={s.slotEmpty}>—</Text>}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[s.compareBtn, selected.length < 2 && s.compareBtnDisabled]}
                        onPress={handleCompare}
                        disabled={selected.length < 2}
                    >
                        <Text style={s.compareBtnText}>Confronta</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ── Stili dinamici (ricostruiti al cambio tema) ───────────────
function makeStyles(C: ReturnType<typeof useTheme>["colors"]) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: C.bg,
            paddingHorizontal: 20,
            paddingTop: 60,
        },
        centered: {
            flex: 1,
            backgroundColor: C.bg,
            justifyContent: "center",
            alignItems: "center",
        },

        // Header
        header: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
        },
        backBtn: {
            backgroundColor: C.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.border,
            width: 44,
            height: 44,
            justifyContent: "center",
            alignItems: "center",
        },
        backArrow: {
            color: C.textSub,
            fontSize: 20,
        },
        headerText: {
            flex: 1,
        },
        title: {
            fontSize: 26,
            fontWeight: "900",
            color: C.textPrimary,
            textTransform: "capitalize",
        },
        hint: {
            fontSize: 12,
            color: C.textSub,
            marginTop: 2,
        },

        // Search input
        searchInput: {
            backgroundColor: C.bgElevated,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.border,
            paddingHorizontal: 16,
            paddingVertical: 13,
            fontSize: 15,
            color: C.textPrimary,
            marginBottom: 16,
        },

        // Card prodotto
        card: {
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 16,
            marginBottom: 10,
        },
        cardSelected: {
            borderColor: C.limeDim,
            backgroundColor: C.limeFaint,
        },
        cardRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        cardInfo: {
            flex: 1,
        },
        brand: {
            fontSize: 10,
            color: C.textSub,
            letterSpacing: 1.5,
            marginBottom: 4,
        },
        name: {
            fontSize: 16,
            fontWeight: "700",
            color: C.textPrimary,
            marginBottom: 6,
        },
        price: {
            fontSize: 18,
            fontWeight: "800",
            color: C.lime,
        },

        // Colonna destra
        rightColumn: {
            alignItems: "center",
            gap: 8,
        },
        infoBtn: {
            backgroundColor: C.border,
            borderRadius: 20,
            width: 26,
            height: 26,
            justifyContent: "center",
            alignItems: "center",
        },
        infoBtnText: {
            color: C.textSub,
            fontSize: 14,
            fontWeight: "700",
        },
        heartIcon: {
            fontSize: 18,
            color: C.textDim,
        },
        heartActive: {
            color: C.red,
        },
        selectionBadge: {
            backgroundColor: C.lime,
            borderRadius: 50,
            width: 22,
            height: 22,
            justifyContent: "center",
            alignItems: "center",
        },
        selectionBadgeText: {
            color: C.textInverse,
            fontWeight: "800",
            fontSize: 11,
        },

        // Stati vuoti ed errori
        emptyText: {
            textAlign: "center",
            color: C.textSub,
            marginTop: 48,
            fontSize: 15,
        },
        errorText: {
            fontSize: 16,
            color: C.red,
            marginBottom: 16,
            textAlign: "center",
        },
        retryBtn: {
            backgroundColor: C.lime,
            padding: 12,
            borderRadius: 10,
        },
        retryText: {
            color: C.textInverse,
            fontWeight: "bold",
        },

        // Barra confronto
        compareBar: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: C.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderColor: C.border,
            paddingHorizontal: 20,
            paddingVertical: 16,
            gap: 12,
            elevation: 16,
        },
        compareSlots: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        slot: {
            flex: 1,
            backgroundColor: C.bg,
            borderRadius: 12,
            padding: 10,
            alignItems: "center",
            minHeight: 48,
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
        },
        slotFilled: {
            backgroundColor: C.limeFaint,
            borderColor: C.limeDim,
        },
        slotNumber: {
            fontSize: 14,
            color: C.lime,
        },
        slotName: {
            fontSize: 12,
            fontWeight: "600",
            color: C.textPrimary,
            textAlign: "center",
        },
        slotEmpty: {
            fontSize: 20,
            color: C.textDim,
        },
        vsText: {
            fontSize: 12,
            fontWeight: "800",
            color: C.textDim,
            letterSpacing: 1,
        },
        compareBtn: {
            backgroundColor: C.lime,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: "center",
        },
        compareBtnDisabled: {
            backgroundColor: C.limeDim,
            opacity: 0.4,
        },
        compareBtnText: {
            color: C.textInverse,
            fontWeight: "800",
            fontSize: 16,
        },
    });
}
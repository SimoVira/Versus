import { useCallback, useEffect, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, TextInput, StatusBar, BackHandler
} from "react-native";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProductService } from "../api/product-service";
import { FavoritesService } from "../api/favorites-service";
import { Product } from "../types/Product";
import { useTheme } from "../theme";
import { selectStore } from "./api/selectStore";

export default function Search() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { category } = useLocalSearchParams<{ category: string }>();
    const productService = new ProductService();
    const favoritesService = new FavoritesService();

    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    //quando cambia category, ricarica i prodotti e i preferiti
    useEffect(function () {
        loadProducts();
        loadFavorites();
    }, [category]);

    useFocusEffect(useCallback(function () {
        if (products.length === 0) return;
        
        syncSelectedFromStore();
    }, [products]));

    function syncSelectedFromStore() {
        setSelectedIds(selectStore.getSelectedIds());
    }

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

    async function handleRefreshPrice(product: Product) {
        setRefreshingId(product._id);
        try {
            const result = await productService.refreshPrice(product._id);
            setProducts(function (prev) {
                return prev.map(function (p) {
                    if (p._id !== product._id) return p;
                    return { ...p, price: result.price, buyUrl: result.buyUrl ?? p.buyUrl };
                });
            });
        } catch (err: any) {
            console.error("Refresh price error:", err.message);
        } finally {
            setRefreshingId(null);
        }
    }

    function toggleSelect(product: Product) {
        setSelectedIds(function (prev) {
            const already = prev.includes(product._id);
            const next = already
                ? prev.filter(function (id) { return id != product._id; })
                : prev.length >= 2
                    ? [prev[0], product._id]
                    : [...prev, product._id];

            return next;
        });
    }

    function getSelectionIndex(id: string): number {
        return selectedIds.findIndex(function (selectedId) { return selectedId == id; });
    }

    function getSelectedProduct(id: string | undefined): Product | undefined {
        if (!id) return undefined;
        return products.find(function (p) { return p._id == id; });
    }

    function handleCompare() {
        if (selectedIds.length != 2) return;
        const [id1, id2] = selectedIds;
        selectStore.reset();
        setSelectedIds([]);
        router.push({ pathname: "/compare", params: { id1, id2 } });
    }

    function handleBack() {
        selectStore.reset();
        setSelectedIds([]);
        router.navigate("/home");
    }

    useFocusEffect(useCallback(function () {
        const subscription = BackHandler.addEventListener("hardwareBackPress", function () {
            handleBack();
            return true;
        });

        return function () {
            subscription.remove();
        };
    }, []));

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
            <Ionicons name="cloud-offline-outline" size={44} color={colors.textDim} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProducts} style={s.retryBtn}>
                <Text style={s.retryText}>Riprova</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={s.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* ── Header ───────────────────────────────────── */}
            <View style={s.header}>
                <TouchableOpacity onPress={handleBack} style={s.iconBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.textSub} />
                </TouchableOpacity>
                <View style={s.headerText}>
                    <Text style={s.title}>{category}</Text>
                    <Text style={s.hint}>
                        {selectedIds.length == 0 && "Seleziona due prodotti da confrontare"}
                        {selectedIds.length == 1 && "Seleziona ancora un prodotto"}
                        {selectedIds.length == 2 && "Pronti per il confronto!"}
                    </Text>
                </View>
            </View>

            {/* ── Ricerca ──────────────────────────────────── */}
            <View style={s.searchWrapper}>
                <Ionicons name="search-outline" size={18} color={colors.textDim} style={{ marginRight: 8 }} />
                <TextInput
                    style={s.searchInput}
                    placeholder="Cerca prodotto..."
                    placeholderTextColor={colors.textDim}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={loadProducts}
                    returnKeyType="search"
                />
            </View>

            {/* ── Lista prodotti ────────────────────────────── */}
            <FlatList
                data={products}
                keyExtractor={function (item) { return item._id; }}
                contentContainerStyle={{ paddingBottom: selectedIds.length > 0 ? 150 : 24 }}
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
                            {/* Strisce laterale verde se selezionato */}
                            {isSelected && <View style={s.cardStripe} />}

                            <View style={s.cardRow}>
                                <View style={s.cardInfo}>
                                    <Text style={s.brand}>{item.brand.toUpperCase()}</Text>
                                    <Text style={s.name}>{item.name}</Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                        <Text style={s.price}>€ {item.price}</Text>
                                        {refreshingId === item._id
                                            ? <ActivityIndicator size="small" color={colors.lime} />
                                            : <TouchableOpacity
                                                onPress={function (e) {
                                                    e.stopPropagation();
                                                    handleRefreshPrice(item);
                                                }}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="refresh-outline" size={15} color={colors.textDim} />
                                            </TouchableOpacity>
                                        }
                                    </View>
                                </View>

                                <View style={s.rightColumn}>

                                    {/* Badge numero selezione */}
                                    {isSelected && (
                                        <View style={s.selectionBadge}>
                                            <Text style={s.selectionBadgeText}>{selIndex + 1}</Text>
                                        </View>
                                    )}

                                    {/* ⓘ info prodotto */}
                                    <TouchableOpacity
                                        style={s.iconCircle}
                                        onPress={function (e) {
                                            e.stopPropagation();
                                            selectStore.setSelectedIds(selectedIds);
                                            router.push({ pathname: "/products/[id]", params: { id: item._id } });
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="information-circle-outline" size={22} color={colors.textSub} />
                                    </TouchableOpacity>

                                    {/* ♥ preferiti */}
                                    <TouchableOpacity
                                        onPress={function (e) {
                                            e.stopPropagation();
                                            handleToggleFavorite(item._id);
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons
                                            name={isFav ? "heart" : "heart-outline"}
                                            size={22}
                                            color={isFav ? colors.red : colors.textDim}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={s.emptyContainer}>
                        <Ionicons name="search-outline" size={48} color={colors.textDim} />
                        <Text style={s.emptyText}>Nessun prodotto trovato</Text>
                    </View>
                }
            />

            {/* ── Barra confronto sticky ────────────────────── */}
            {selectedIds.length > 0 && (
                <View style={s.compareBar}>
                    <View style={s.compareSlots}>
                        <View style={[s.slot, selectedIds[0] && s.slotFilled]}>
                            {selectedIds[0] ? (
                                <>
                                    <Text style={s.slotNumber}>①</Text>
                                    <Text style={s.slotName} numberOfLines={1}>
                                        {getSelectedProduct(selectedIds[0])?.name ?? "Prodotto selezionato"}
                                    </Text>
                                </>
                            ) : (
                                <Ionicons name="add-circle-outline" size={22} color={colors.textDim} />
                            )}
                        </View>

                        <Text style={s.vsText}>VS</Text>

                        <View style={[s.slot, selectedIds[1] && s.slotFilled]}>
                            {selectedIds[1] ? (
                                <>
                                    <Text style={s.slotNumber}>②</Text>
                                    <Text style={s.slotName} numberOfLines={1}>
                                        {getSelectedProduct(selectedIds[1])?.name ?? "Prodotto selezionato"}
                                    </Text>
                                </>
                            ) : (
                                <Ionicons name="add-circle-outline" size={22} color={colors.textDim} />
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[s.compareBtn, selectedIds.length < 2 && s.compareBtnDisabled]}
                        onPress={handleCompare}
                        disabled={selectedIds.length < 2}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="git-compare-outline" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
                        <Text style={s.compareBtnText}>Confronta</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function makeStyles(C: ReturnType<typeof useTheme>["colors"]) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 60 },
        centered: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", gap: 16 },

        header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
        iconBtn: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, width: 46, height: 46, justifyContent: "center", alignItems: "center" },
        headerText: { flex: 1 },
        title: { fontSize: 26, fontWeight: "900", color: C.textPrimary, textTransform: "capitalize" },
        hint: { fontSize: 13, color: C.textSub, marginTop: 3, fontWeight: "500" },

        searchWrapper: {
            flexDirection: "row", alignItems: "center",
            backgroundColor: C.inputBg, borderRadius: 14,
            borderWidth: 1, borderColor: C.border,
            paddingHorizontal: 14, marginBottom: 16,
        },
        searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: C.textPrimary },

        card: {
            backgroundColor: C.card, borderRadius: 16,
            borderWidth: 1, borderColor: C.border,
            padding: 16, marginBottom: 10,
            flexDirection: "row", overflow: "hidden",
        },
        cardSelected: { borderColor: C.limeDim, backgroundColor: C.slotSelected },
        cardStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.lime },
        cardRow: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        cardInfo: { flex: 1 },
        brand: { fontSize: 11, color: C.textSub, letterSpacing: 1.5, marginBottom: 4, fontWeight: "600" },
        name: { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 6, lineHeight: 22 },
        price: { fontSize: 19, fontWeight: "800", color: C.lime },

        rightColumn: { alignItems: "center", gap: 10, paddingLeft: 12 },
        selectionBadge: { backgroundColor: C.lime, borderRadius: 50, width: 24, height: 24, justifyContent: "center", alignItems: "center" },
        selectionBadgeText: { color: C.textInverse, fontWeight: "800", fontSize: 12 },
        iconCircle: { padding: 2 },

        emptyContainer: { alignItems: "center", marginTop: 64, gap: 12 },
        emptyText: { color: C.textSub, fontSize: 15, textAlign: "center" },
        errorText: { fontSize: 15, color: C.red, textAlign: "center", paddingHorizontal: 32 },
        retryBtn: { backgroundColor: C.lime, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
        retryText: { color: C.textInverse, fontWeight: "700", fontSize: 15 },

        compareBar: {
            position: "absolute", bottom: 0, left: 0, right: 0,
            backgroundColor: C.card,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            borderTopWidth: 1, borderColor: C.border,
            paddingHorizontal: 20, paddingVertical: 16, gap: 12,
            elevation: 16,
            shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15, shadowRadius: 12,
        },
        compareSlots: { flexDirection: "row", alignItems: "center", gap: 8 },
        slot: {
            flex: 1, backgroundColor: C.bg, borderRadius: 12,
            padding: 10, alignItems: "center", minHeight: 50,
            justifyContent: "center", borderWidth: 1, borderColor: C.border,
        },
        slotFilled: { backgroundColor: C.slotSelected, borderColor: C.limeDim },
        slotNumber: { fontSize: 14, color: C.lime, fontWeight: "700" },
        slotName: { fontSize: 12, fontWeight: "600", color: C.textPrimary, textAlign: "center", marginTop: 2 },
        vsText: { fontSize: 13, fontWeight: "800", color: C.textDim, letterSpacing: 1 },
        compareBtn: { flexDirection: "row", backgroundColor: C.lime, borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
        compareBtnDisabled: { opacity: 0.35 },
        compareBtnText: { color: C.textInverse, fontWeight: "800", fontSize: 16 },
    });
}

import { useEffect, useState, useRef } from "react";
import {
    View, Text, StyleSheet,
    ActivityIndicator, TouchableOpacity, Image,
    Dimensions, Animated, StatusBar
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { ProductService } from "../../api/product-service";
import { FavoritesService } from "../../api/favorites-service";
import { Product, PriceRefreshResponse } from "../../types/Product";

const { width } = Dimensions.get("window");

export default function ProductDetail() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const productService = new ProductService();
    const favoritesService = new FavoritesService();

    const s = makeStyles(colors);

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshResult, setRefreshResult] = useState<{ ok: boolean; text: string } | null>(null);
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(function () {
        if (!id) return;
        productService.getProductById(id)
            .then(function (data) {
                setProduct(data);
                return favoritesService.isFavorite(id);
            })
            .then(function (fav) {
                setIsFavorite(fav);
                Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
            })
            .catch(function (err) { setError(err.message); })
            .finally(function () { setLoading(false); });
    }, [id]);

    async function handleToggleFavorite() {
        if (!product) return;
        try {
            await favoritesService.updateFavorites(product._id);
            setIsFavorite(function (prev) { return !prev; });
        } catch (err: any) {
            console.error(err.message);
        }
    }

    function handleRefreshPrice() {
        if (!product) return;
        setRefreshing(true);
        setRefreshResult(null);
        productService.refreshPrice(product._id)
            .then(function (priceRefreshResponse: PriceRefreshResponse) {
                setProduct(function (prev) {
                    return prev ? { ...prev, price: priceRefreshResponse.price } : prev;
                });
                setRefreshResult({ ok: true, text: `€ ${priceRefreshResponse.price.toFixed(2)} · ${priceRefreshResponse.source}` });
            })
            .catch(function (err) {
                setRefreshResult({ ok: false, text: err.message ?? "Errore di rete" });
            })
            .finally(function () {
                setRefreshing(false);
            });
    }

    if (loading) return (
        <View style={s.centered}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ActivityIndicator size="large" color={colors.lime} />
        </View>
    );

    if (error || !product) return (
        <View style={s.centered}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Text style={s.errorText}>{error ?? "Prodotto non trovato"}</Text>
            <TouchableOpacity style={s.backBtnError} onPress={() => router.back()}>
                <Text style={s.backBtnErrorText}>← Torna indietro</Text>
            </TouchableOpacity>
        </View>
    );

    const specs = product.specs as Record<string, any>;

    return (
        <View style={s.root}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={s.topBar}>
                <TouchableOpacity style={s.topBtn} onPress={() => router.back()}>
                    <Text style={s.topBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={s.topBarTitle} numberOfLines={1}>{product.name}</Text>
                <TouchableOpacity style={s.topBtn} onPress={handleToggleFavorite}>
                    <Text style={[s.heartIcon, isFavorite && s.heartActive]}>
                        {isFavorite ? "♥" : "♡"}
                    </Text>
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeIn }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scroll}
            >
                {product.imageUrl && (
                    <View style={s.imageContainer}>
                        <View style={s.imageWrapper}>
                            <Image source={{ uri: product.imageUrl }} style={s.image} resizeMode="contain" />
                        </View>
                    </View>
                )}

                <View style={s.infoCard}>
                    <View style={s.infoRow}>
                        <View style={s.categoryTag}>
                            <Text style={s.categoryTagText}>{product.category.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={s.brand}>{product.brand.toUpperCase()}</Text>
                    <Text style={s.name}>{product.name}</Text>

                    {/* ── Prezzo + bottone refresh ── */}
                    <View style={s.priceRow}>
                        <Text style={s.price}>€ {product.price.toFixed(2)}</Text>
                        <TouchableOpacity
                            style={[s.refreshBtn, refreshing && s.refreshBtnDisabled]}
                            onPress={handleRefreshPrice}
                            disabled={refreshing}
                            activeOpacity={0.75}
                        >
                            {refreshing
                                ? <ActivityIndicator size="small" color={colors.lime} />
                                : <Ionicons name="refresh-outline" size={16} color={colors.lime} />
                            }
                            <Text style={s.refreshBtnText}>
                                {refreshing ? "Ricerca..." : "Aggiorna"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── Feedback refresh ── */}
                    {refreshResult && (
                        <View style={[s.refreshResult, refreshResult.ok ? s.refreshResultOk : s.refreshResultErr]}>
                            <Ionicons
                                name={refreshResult.ok ? "checkmark-circle-outline" : "alert-circle-outline"}
                                size={14}
                                color={refreshResult.ok ? colors.lime : colors.red}
                            />
                            <Text style={[s.refreshResultText, { color: refreshResult.ok ? colors.lime : colors.red }]}>
                                {refreshResult.ok ? `Prezzo aggiornato: ${refreshResult.text}` : refreshResult.text}
                            </Text>
                        </View>
                    )}
                </View>

                <SectionLabel text="SPECIFICHE" colors={colors} />
                <View style={s.specsCard}>
                    {Object.entries(specs).map(function ([key, value], i) {
                        const display = Array.isArray(value)
                            ? value.join(", ")
                            : typeof value === "boolean"
                                ? value ? "Sì" : "No"
                                : String(value);
                        return (
                            <View key={key} style={[s.specRow, i > 0 && s.specRowBorder]}>
                                <Text style={s.specKey}>{key}</Text>
                                <Text style={s.specValue}>{display}</Text>
                            </View>
                        );
                    })}
                </View>

                {product.priceHistory && product.priceHistory.length > 0 && (
                    <>
                        <SectionLabel text="STORICO PREZZI" colors={colors} />
                        <View style={s.specsCard}>
                            {product.priceHistory.slice().reverse().map(function (entry, i) {
                                return (
                                    <View key={i} style={[s.specRow, i > 0 && s.specRowBorder]}>
                                        <View style={s.historyLeft}>
                                            <Text style={s.specKey}>{entry.date}</Text>
                                            {entry.source && (
                                                <Text style={s.historySource}>{entry.source}</Text>
                                            )}
                                        </View>
                                        <Text style={[s.specValue, { color: colors.lime }]}>
                                            € {entry.price.toFixed(2)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                <TouchableOpacity
                    style={s.compareBtn}
                    onPress={function () {
                        router.push({
                            pathname: "/search",
                            params: { category: product.category }
                        });
                    }}
                    activeOpacity={0.85}
                >
                    <Text style={s.compareBtnText}>Confronta questo prodotto →</Text>
                </TouchableOpacity>

                <View style={{ height: 48 }} />
            </Animated.ScrollView>
        </View>
    );
}

function SectionLabel({ text, colors }: { text: string; colors: ReturnType<typeof useTheme>["colors"] }) {
    const s = makeStyles(colors);
    return (
        <View style={s.sectionLabelRow}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>{text}</Text>
            <View style={s.sectionLine} />
        </View>
    );
}

function makeStyles(C: ReturnType<typeof useTheme>["colors"]) {
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: C.bg },
        scroll: { paddingHorizontal: 20, paddingBottom: 24 },
        centered: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", gap: 16 },

        // Top bar
        topBar: {
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
            backgroundColor: C.bg,
        },
        topBtn: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
        topBtnText: { color: C.textSub, fontSize: 20 },
        topBarTitle: { flex: 1, color: C.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "center", marginHorizontal: 12 },
        heartIcon: { fontSize: 20, color: C.textDim },
        heartActive: { color: C.red },

        // Immagini
        imageContainer: { marginBottom: 20 },
        imageWrapper: {
            width: width - 40, height: 240,
            backgroundColor: C.bg, borderRadius: 20,
            borderWidth: 1, borderColor: C.border,
            justifyContent: "center", alignItems: "center",
        },
        image: { width: "100%", height: "100%" },
        imagePlaceholder: { fontSize: 64, opacity: 0.3 },
        dots: { flexDirection: "row", justifyContent: "center", marginTop: 10, gap: 6 },
        dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
        dotActive: { backgroundColor: C.lime },

        // Info card
        infoCard: {
            backgroundColor: C.card, borderRadius: 20,
            borderWidth: 1, borderColor: C.border,
            padding: 20, marginBottom: 8, gap: 6,
        },
        infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
        categoryTag: { backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
        categoryTagText: { color: C.textSub, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
        brand: { color: C.textSub, fontSize: 11, letterSpacing: 2 },
        name: { color: C.textPrimary, fontSize: 22, fontWeight: "800", lineHeight: 28 },

        // Prezzo + refresh
        priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
        price: { color: C.lime, fontSize: 28, fontWeight: "900" },
        refreshBtn: {
            flexDirection: "row", alignItems: "center", gap: 6,
            borderWidth: 1, borderColor: C.lime,
            borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
            minWidth: 110, justifyContent: "center",
        },
        refreshBtnDisabled: { opacity: 0.5 },
        refreshBtnText: { color: C.lime, fontSize: 13, fontWeight: "700" },

        // Feedback refresh
        refreshResult: {
            flexDirection: "row", alignItems: "center", gap: 6,
            borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
            marginTop: 4,
        },
        refreshResultOk: { backgroundColor: `${C.lime}18` },
        refreshResultErr: { backgroundColor: `${C.red}18` },
        refreshResultText: { fontSize: 12, fontWeight: "600", flexShrink: 1 },

        // Section label
        sectionLabelRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
        sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
        sectionLabel: { color: C.textSub, fontSize: 11, fontWeight: "700", letterSpacing: 2, marginHorizontal: 12 },

        // Specs
        specsCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
        specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16 },
        specRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
        specKey: { fontSize: 13, color: C.textSub, flex: 1 },
        specValue: { fontSize: 13, color: C.textPrimary, fontWeight: "600", flex: 1, textAlign: "right" },

        // Storico prezzi
        historyLeft: { flex: 1, gap: 2 },
        historySource: { fontSize: 11, color: C.textDim },

        // Bottone confronta
        compareBtn: { backgroundColor: C.lime, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 24 },
        compareBtnText: { color: "#000", fontSize: 16, fontWeight: "800" },

        // Error
        errorText: { color: C.red, fontSize: 16, textAlign: "center", paddingHorizontal: 32 },
        backBtnError: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
        backBtnErrorText: { color: C.textSub, fontSize: 14 },
    });
}

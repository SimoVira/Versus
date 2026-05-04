import { useEffect, useState, useRef } from "react";
import {
    View, Text, ScrollView, StyleSheet,
    ActivityIndicator, TouchableOpacity, FlatList,
    Dimensions, Animated, StatusBar
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProductService } from "../../api/product-service";
import { FavoritesService } from "../../api/favorites-service";
import { Product } from "../../types/Product";

const { width } = Dimensions.get("window");

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
    imageBg: "#0E0E1A",
};

export default function ProductDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const productService = new ProductService();
    const favoritesService = new FavoritesService();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImage, setCurrentImage] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
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

    if (loading) return (
        <View style={styles.centered}>
            <StatusBar barStyle="light-content" />
            <ActivityIndicator size="large" color={C.lime} />
        </View>
    );

    if (error || !product) return (
        <View style={styles.centered}>
            <StatusBar barStyle="light-content" />
            <Text style={styles.errorText}>{error ?? "Prodotto non trovato"}</Text>
            <TouchableOpacity style={styles.backBtnError} onPress={() => router.back()}>
                <Text style={styles.backBtnErrorText}>← Torna indietro</Text>
            </TouchableOpacity>
        </View>
    );

    const specs = product.specs as Record<string, any>;

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" />

            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
                    <Text style={styles.topBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.topBarTitle} numberOfLines={1}>{product.name}</Text>
                <TouchableOpacity style={styles.topBtn} onPress={handleToggleFavorite}>
                    <Text style={[styles.heartIcon, isFavorite && styles.heartActive]}>
                        {isFavorite ? "♥" : "♡"}
                    </Text>
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeIn }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                {product.images && product.images.length > 0 && (
                    <View style={styles.imageContainer}>
                        <FlatList
                            data={product.images}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={function (e) {
                                const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                                setCurrentImage(index);
                            }}
                            renderItem={function ({ item }) {
                                return (
                                    <View style={styles.imageWrapper}>
                                        <Text style={styles.imagePlaceholder}>📷</Text>
                                        {/* Sostituisci con <Image source={{ uri: item }} style={styles.image} resizeMode="contain" /> */}
                                    </View>
                                );
                            }}
                            keyExtractor={function (_, i) { return String(i); }}
                        />
                        {product.images.length > 1 && (
                            <View style={styles.dots}>
                                {product.images.map(function (_, i) {
                                    return (
                                        <View key={i} style={[styles.dot, i === currentImage && styles.dotActive]} />
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <View style={styles.categoryTag}>
                            <Text style={styles.categoryTagText}>{product.category.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.price}>€ {product.price.toFixed(2)}</Text>
                </View>

                <SectionLabel text="SPECIFICHE" />
                <View style={styles.specsCard}>
                    {Object.entries(specs).map(function ([key, value], i) {
                        const display = Array.isArray(value)
                            ? value.join(", ")
                            : typeof value === "boolean"
                                ? value ? "Sì" : "No"
                                : String(value);
                        return (
                            <View key={key} style={[styles.specRow, i > 0 && styles.specRowBorder]}>
                                <Text style={styles.specKey}>{key}</Text>
                                <Text style={styles.specValue}>{display}</Text>
                            </View>
                        );
                    })}
                </View>

                {product.priceHistory && product.priceHistory.length > 0 && (
                    <>
                        <SectionLabel text="STORICO PREZZI" />
                        <View style={styles.specsCard}>
                            {product.priceHistory.slice().reverse().map(function (entry, i) {
                                return (
                                    <View key={i} style={[styles.specRow, i > 0 && styles.specRowBorder]}>
                                        <Text style={styles.specKey}>{entry.date}</Text>
                                        <Text style={[styles.specValue, { color: C.lime }]}>
                                            € {entry.price.toFixed(2)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                <TouchableOpacity
                    style={styles.compareBtn}
                    onPress={function () {
                        router.push({
                            pathname: "/search",
                            params: { category: product.category }
                        });
                    }}
                    activeOpacity={0.85}
                >
                    <Text style={styles.compareBtnText}>Confronta questo prodotto →</Text>
                </TouchableOpacity>

                <View style={{ height: 48 }} />
            </Animated.ScrollView>
        </View>
    );
}

function SectionLabel({ text }: { text: string }) {
    return (
        <View style={styles.sectionLabelRow}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>{text}</Text>
            <View style={styles.sectionLine} />
        </View>
    );
}

const styles = StyleSheet.create({
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
        backgroundColor: C.imageBg, borderRadius: 20,
        borderWidth: 1, borderColor: C.border,
        justifyContent: "center", alignItems: "center",
    },
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
    price: { color: C.lime, fontSize: 28, fontWeight: "900", marginTop: 4 },

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

    // Bottone confronta
    compareBtn: { backgroundColor: C.lime, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 24 },
    compareBtnText: { color: "#000", fontSize: 16, fontWeight: "800" },

    // Error
    errorText: { color: C.red, fontSize: 16, textAlign: "center", paddingHorizontal: 32 },
    backBtnError: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnErrorText: { color: C.textSub, fontSize: 14 },
});
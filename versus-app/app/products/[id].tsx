import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    FlatList,
    Dimensions,
} from "react-native";
import { ProductService } from "../../api/product-service";
import { useLocalSearchParams, router } from "expo-router";
import { inviaRichiesta } from "../../api/client";
import { Product } from "../../types/Product";

const { width } = Dimensions.get("window");

export default function ProductDetail() {
    const productService = new ProductService();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImage, setCurrentImage] = useState(0);

    useEffect(function () {
        if (!id) return;
        const response = productService.getProductById(id);
        response.then(function (data) {
            setProduct(data);
        }).catch(function (err) {
            setError(err.message);
        }).finally(function () {
            setLoading(false);
        });
    }, [id]);

    // --- Loading ---
    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6C63FF" />
                <Text style={styles.loadingText}>Caricamento prodotto...</Text>
            </View>
        );
    }

    // --- Error ---
    if (error || !product) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error ?? "Prodotto non trovato"}</Text>
                <TouchableOpacity style={styles.backBtn} onPress={function () { router.back(); }}>
                    <Text style={styles.backBtnText}>← Torna indietro</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const specs = product.specs as Record<string, any>;

    // --- Main ---
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

            {/* Carosello immagini */}
            {product.images.length > 0 && (
                <View>
                    <FlatList
                        data={product.images}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={function (e) {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            setCurrentImage(index);
                        }}
                        renderItem={function ({ item }) {
                            return (
                                <Image
                                    source={{ uri: item }}
                                    style={styles.image}
                                    resizeMode="contain"
                                />
                            );
                        }}
                        keyExtractor={function (_, i) { return String(i); }}
                    />
                    {product.images.length > 1 && (
                        <View style={styles.dots}>
                            {product.images.map(function (_, i) {
                                return (
                                    <View
                                        key={i}
                                        style={[styles.dot, i === currentImage && styles.dotActive]}
                                    />
                                );
                            })}
                        </View>
                    )}
                </View>
            )}

            {/* Info principali */}
            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.category}>{product.category.toUpperCase()}</Text>
                    <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>⭐ {product.commonScore.toFixed(1)}</Text>
                    </View>
                </View>
                <Text style={styles.brand}>{product.brand}</Text>
                <Text style={styles.name}>{product.name}</Text>
                <Text style={styles.price}>€ {product.price.toFixed(2)}</Text>
            </View>

            {/* Specifiche tecniche */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Specifiche tecniche</Text>
                {Object.entries(specs).map(function ([key, value]) {
                    return (
                        <View key={key} style={styles.specRow}>
                            <Text style={styles.specKey}>{key}</Text>
                            <Text style={styles.specValue}>
                                {Array.isArray(value)
                                    ? value.join(", ")
                                    : typeof value === "boolean"
                                        ? value ? "Sì" : "No"
                                        : String(value)}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* Storico prezzi */}
            {product.priceHistory.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Storico prezzi</Text>
                    {product.priceHistory.slice().reverse().map(function (entry, i) {
                        return (
                            <View key={i} style={styles.priceRow}>
                                <Text style={styles.priceDate}>{entry.date}</Text>
                                <Text style={styles.priceValue}>€ {entry.price.toFixed(2)}</Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Bottone confronto */}
            <TouchableOpacity
                style={styles.compareBtn}
                onPress={function () {
                    // TODO: navigare alla schermata di confronto passando questo prodotto
                    // router.push({ pathname: "/compare", params: { id: product._id } });
                }}
            >
                <Text style={styles.compareBtnText}>Confronta questo prodotto</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

// ─────────────────────────────────────────
// STILI
// ─────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f8f8",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        color: "#666",
        fontSize: 15,
    },
    errorText: {
        color: "#e74c3c",
        fontSize: 16,
        textAlign: "center",
        marginBottom: 16,
    },
    backBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#6C63FF",
        borderRadius: 8,
    },
    backBtnText: {
        color: "#fff",
        fontWeight: "600",
    },

    // Immagini
    image: {
        width,
        height: 280,
        backgroundColor: "#fff",
    },
    dots: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 8,
        gap: 6,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#ccc",
    },
    dotActive: {
        backgroundColor: "#6C63FF",
    },

    // Sezioni card
    section: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
        marginBottom: 12,
    },

    // Header prodotto
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    category: {
        fontSize: 11,
        fontWeight: "700",
        color: "#6C63FF",
        letterSpacing: 1,
    },
    scoreBadge: {
        backgroundColor: "#FFF8E1",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    scoreText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#F59E0B",
    },
    brand: {
        fontSize: 13,
        color: "#888",
        marginBottom: 2,
    },
    name: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    price: {
        fontSize: 26,
        fontWeight: "700",
        color: "#6C63FF",
    },

    // Specifiche
    specRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    specKey: {
        fontSize: 14,
        color: "#555",
        flex: 1,
        fontWeight: "500",
    },
    specValue: {
        fontSize: 14,
        color: "#1a1a1a",
        flex: 1,
        textAlign: "right",
        fontWeight: "600",
    },

    // Storico prezzi
    priceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    priceDate: {
        fontSize: 13,
        color: "#888",
    },
    priceValue: {
        fontSize: 13,
        fontWeight: "600",
        color: "#333",
    },

    // Bottone confronta
    compareBtn: {
        margin: 16,
        marginTop: 20,
        backgroundColor: "#6C63FF",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    compareBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});
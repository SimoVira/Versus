import { useEffect, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, TextInput
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ProductService } from "../api/product-service";
import { Product } from "../types/Product";

export default function Search() {
    const router = useRouter();
    const { category } = useLocalSearchParams<{ category: string }>();
    const productService = new ProductService();

    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    useEffect(function () {
        loadProducts();
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

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6C63FF" />
        </View>
    );

    if (error) return (
        <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProducts} style={styles.retryBtn}>
                <Text style={styles.retryText}>Riprova</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{category}</Text>

            <TextInput
                style={styles.searchInput}
                placeholder="Cerca prodotto..."
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={loadProducts}
                returnKeyType="search"
            />

            <FlatList
                data={products}
                keyExtractor={(item) => item._id}
                renderItem={function ({ item }) {
                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={function () {
                                router.push({
                                    pathname: "/products/[id]",
                                    params: { id: item._id }
                                });
                            }}
                        >
                            <View style={styles.cardRow}>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.brand}>{item.brand}</Text>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={styles.price}>€ {item.price}</Text>
                                </View>
                                <View style={styles.scoreBadge}>
                                    <Text style={styles.scoreText}>{item.commonScore}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Nessun prodotto trovato</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16, paddingTop: 60 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 28, fontWeight: "bold", color: "#6C63FF", marginBottom: 16, textTransform: "capitalize" },
    searchInput: {
        backgroundColor: "#fff", borderRadius: 12, padding: 12,
        fontSize: 16, marginBottom: 16, elevation: 2
    },
    card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
    cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardInfo: { flex: 1 },
    brand: { fontSize: 12, color: "#888", marginBottom: 2 },
    name: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
    price: { fontSize: 18, fontWeight: "bold", color: "#6C63FF" },
    scoreBadge: {
        backgroundColor: "#6C63FF", borderRadius: 50,
        width: 50, height: 50, justifyContent: "center", alignItems: "center"
    },
    scoreText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    emptyText: { textAlign: "center", color: "#888", marginTop: 40, fontSize: 16 },
    errorText: { fontSize: 16, color: "red", marginBottom: 16 },
    retryBtn: { backgroundColor: "#6C63FF", padding: 12, borderRadius: 8 },
    retryText: { color: "#fff", fontWeight: "bold" },
});
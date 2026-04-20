import { useEffect, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, TextInput,
    Animated
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
    const [selected, setSelected] = useState<Product[]>([]);

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

    function toggleSelect(product: Product) {
        setSelected(function (prev) {
            const alreadySelected = prev.find(function (p) { return p._id === product._id; });

            if (alreadySelected) {
                // Deseleziona
                return prev.filter(function (p) { return p._id !== product._id; });
            }
            if (prev.length >= 2) {
                // Max 2 prodotti: rimpiazza il secondo
                return [prev[0], product];
            }
            return [...prev, product];
        });
    }

    function getSelectionIndex(id: string): number {
        return selected.findIndex(function (p) { return p._id === id; });
    }

    function handleCompare() {
        if (selected.length !== 2) return;
        router.push({
            pathname: "/compare",
            params: { id1: selected[0]._id, id2: selected[1]._id }
        });
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

            {/* Hint contestuale */}
            <Text style={styles.hint}>
                {selected.length === 0 && "Seleziona due prodotti da confrontare"}
                {selected.length === 1 && "Seleziona ancora un prodotto"}
                {selected.length === 2 && "Pronti per il confronto!"}
            </Text>

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
                keyExtractor={function (item) { return item._id; }}
                contentContainerStyle={{ paddingBottom: selected.length > 0 ? 110 : 16 }}
                renderItem={function ({ item }) {
                    const selIndex = getSelectionIndex(item._id);
                    const isSelected = selIndex !== -1;

                    return (
                        <TouchableOpacity
                            style={[styles.card, isSelected && styles.cardSelected]}
                            onPress={function () { toggleSelect(item); }}
                            activeOpacity={0.75}
                        >
                            <View style={styles.cardRow}>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.brand}>{item.brand}</Text>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={styles.price}>€ {item.price}</Text>
                                </View>

                                <View style={styles.rightColumn}>
                                    {/* Badge selezione */}
                                    {isSelected && (
                                        <View style={styles.selectionBadge}>
                                            <Text style={styles.selectionBadgeText}>{selIndex + 1}</Text>
                                        </View>
                                    )}
                                    {/* Score */}
                                    <View style={[styles.scoreBadge, isSelected && styles.scoreBadgeSelected]}>
                                        <Text style={styles.scoreText}>{item.commonScore}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Nessun prodotto trovato</Text>
                }
            />

            {/* Barra confronto sticky */}
            {selected.length > 0 && (
                <View style={styles.compareBar}>
                    <View style={styles.compareSlots}>
                        {/* Slot 1 */}
                        <View style={[styles.slot, selected[0] && styles.slotFilled]}>
                            {selected[0]
                                ? <>
                                    <Text style={styles.slotNumber}>①</Text>
                                    <Text style={styles.slotName} numberOfLines={1}>{selected[0].name}</Text>
                                </>
                                : <Text style={styles.slotEmpty}>—</Text>
                            }
                        </View>

                        <Text style={styles.vsText}>VS</Text>

                        {/* Slot 2 */}
                        <View style={[styles.slot, selected[1] && styles.slotFilled]}>
                            {selected[1]
                                ? <>
                                    <Text style={styles.slotNumber}>②</Text>
                                    <Text style={styles.slotName} numberOfLines={1}>{selected[1].name}</Text>
                                </>
                                : <Text style={styles.slotEmpty}>—</Text>
                            }
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
    container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16, paddingTop: 60 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },

    title: { fontSize: 28, fontWeight: "bold", color: "#6C63FF", marginBottom: 4, textTransform: "capitalize" },
    hint: { fontSize: 13, color: "#999", marginBottom: 12 },

    searchInput: {
        backgroundColor: "#fff", borderRadius: 12, padding: 12,
        fontSize: 16, marginBottom: 16, elevation: 2
    },

    // Card
    card: {
        backgroundColor: "#fff", borderRadius: 16, padding: 16,
        marginBottom: 12, elevation: 3,
        borderWidth: 2, borderColor: "transparent"
    },
    cardSelected: {
        borderColor: "#6C63FF",
        backgroundColor: "#F3F2FF",
    },
    cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardInfo: { flex: 1 },
    brand: { fontSize: 12, color: "#888", marginBottom: 2 },
    name: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
    price: { fontSize: 18, fontWeight: "bold", color: "#6C63FF" },

    rightColumn: { alignItems: "center", gap: 6 },
    selectionBadge: {
        backgroundColor: "#6C63FF", borderRadius: 50,
        width: 22, height: 22, justifyContent: "center", alignItems: "center"
    },
    selectionBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

    scoreBadge: {
        backgroundColor: "#6C63FF", borderRadius: 50,
        width: 50, height: 50, justifyContent: "center", alignItems: "center"
    },
    scoreBadgeSelected: { backgroundColor: "#4B44CC" },
    scoreText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

    emptyText: { textAlign: "center", color: "#888", marginTop: 40, fontSize: 16 },
    errorText: { fontSize: 16, color: "red", marginBottom: 16 },
    retryBtn: { backgroundColor: "#6C63FF", padding: 12, borderRadius: 8 },
    retryText: { color: "#fff", fontWeight: "bold" },

    // Barra confronto
    compareBar: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingHorizontal: 16, paddingVertical: 14,
        elevation: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1, shadowRadius: 8,
        gap: 12,
    },
    compareSlots: {
        flexDirection: "row", alignItems: "center", gap: 8
    },
    slot: {
        flex: 1, backgroundColor: "#F5F5F5", borderRadius: 10,
        padding: 8, alignItems: "center", minHeight: 44, justifyContent: "center",
        borderWidth: 1, borderColor: "#E0E0E0"
    },
    slotFilled: {
        backgroundColor: "#F3F2FF", borderColor: "#6C63FF"
    },
    slotNumber: { fontSize: 14, color: "#6C63FF" },
    slotName: { fontSize: 12, fontWeight: "600", color: "#333", textAlign: "center" },
    slotEmpty: { fontSize: 20, color: "#CCC" },
    vsText: { fontSize: 13, fontWeight: "bold", color: "#999" },

    compareBtn: {
        backgroundColor: "#6C63FF", borderRadius: 14,
        paddingVertical: 14, alignItems: "center"
    },
    compareBtnDisabled: { backgroundColor: "#C4C1F0" },
    compareBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
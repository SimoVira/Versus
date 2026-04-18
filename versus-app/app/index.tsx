import { useEffect, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { getCategories } from "../api/categoryService";
import { TechCategory } from "../types/Product";

const CATEGORY_ICONS: Record<string, string> = {
    smartphone: "📱",
    laptop: "💻",
    tablet: "🖥️",
    monitor: "🖹",
    cpu: "🔲",
    gpu: "🎮",
    cuffie: "🎧",
    smartwatch: "⌚",
};

export default function Home() {
    const router = useRouter();
    const [categories, setCategories] = useState<TechCategory[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    useEffect(function () {
        loadCategories();
    }, []);

    async function loadCategories() {
        setLoading(true);
        setError("");
        try {
            const data = await getCategories();
            setCategories(data);
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
            <TouchableOpacity onPress={loadCategories} style={styles.retryBtn}>
                <Text style={styles.retryText}>Riprova</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Versus</Text>
            <Text style={styles.subtitle}>Scegli una categoria</Text>
            <FlatList
                data={categories}
                keyExtractor={(item) => item}
                numColumns={2}
                renderItem={function ({ item }) {
                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={function () {
                                router.push({
                                    pathname: "/search",
                                    params: { category: item }
                                });
                            }}
                        >
                            <Text style={styles.icon}>{CATEGORY_ICONS[item] ?? "📦"}</Text>
                            <Text style={styles.categoryName}>{item}</Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16, paddingTop: 60 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 36, fontWeight: "bold", color: "#6C63FF", marginBottom: 4 },
    subtitle: { fontSize: 16, color: "#888", marginBottom: 24 },
    card: {
        flex: 1, margin: 8, backgroundColor: "#fff",
        borderRadius: 16, padding: 24,
        alignItems: "center", justifyContent: "center",
        elevation: 3,
    },
    icon: { fontSize: 40, marginBottom: 8 },
    categoryName: { fontSize: 14, fontWeight: "600", color: "#333", textTransform: "capitalize" },
    errorText: { fontSize: 16, color: "red", marginBottom: 16 },
    retryBtn: { backgroundColor: "#6C63FF", padding: 12, borderRadius: 8 },
    retryText: { color: "#fff", fontWeight: "bold" },
});
import { useEffect, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, StatusBar
} from "react-native";
import { useRouter } from "expo-router";
import { CategoryService } from "../api/category-service";
import { TechCategory } from "../types/Product";
import { AuthService } from "../api/auth-service";

const C = {
    bg:          "#08080F",
    card:        "#111118",
    border:      "#1C1C2E",
    lime:        "#C8F135",
    limeDim:     "#8AAF22",
    textPrimary: "#EEEEF8",
    textSub:     "#7070A0",
    textDim:     "#3A3A5C",
};

const CATEGORY_ICONS: Record<string, string> = {
    smartphone: "📱",
    laptop:     "💻",
    tablet:     "",
    monitor:    "🖥️",
    cpu:        "🔲",
    gpu:        "🎮",
    cuffie:     "🎧",
    smartwatch: "⌚",
};

export default function Home() {
    const router = useRouter();
    const categoryService = new CategoryService();

    const [categories, setCategories] = useState<TechCategory[]>([]);
    const [loading, setLoading]       = useState<boolean>(true);
    const [error, setError]           = useState<string>("");
    const [userName, setUserName]     = useState<string>("");

    useEffect(function () {
        AuthService.isLoggedIn().then(function (logged) {
            if (!logged) router.replace("/login");
        });
        AuthService.getUser().then(function (user) {
            if (user) setUserName(user.name);
        });
        loadCategories();
    }, []);

    async function loadCategories() {
        setLoading(true);
        setError("");
        try {
            const data = await categoryService.getCategories();
            setCategories(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleLogout() {
        Alert.alert(
            "Logout",
            "Sei sicuro di voler uscire?",
            [
                { text: "Annulla", style: "cancel" },
                {
                    text: "Esci",
                    style: "destructive",
                    onPress: async function () {
                        await AuthService.logout();
                        router.replace("/login");
                    }
                }
            ]
        );
    }

    if (loading) return (
        <View style={styles.centered}>
            <StatusBar barStyle="light-content" />
            <ActivityIndicator size="large" color={C.lime} />
        </View>
    );

    if (error) return (
        <View style={styles.centered}>
            <StatusBar barStyle="light-content" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadCategories} style={styles.retryBtn}>
                <Text style={styles.retryText}>Riprova</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <View>
                    <Text style={styles.brand}>versus</Text>
                    {userName !== "" && (
                        <Text style={styles.welcome}>Ciao, {userName} 👋</Text>
                    )}
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutIcon}>➜]</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionLabelRow}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionLabel}>CATEGORIE</Text>
                <View style={styles.sectionLine} />
            </View>

            <FlatList
                data={categories}
                keyExtractor={(item) => item}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.grid}
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
                            activeOpacity={0.75}
                        >
                            <Text style={styles.cardIcon}>{CATEGORY_ICONS[item] ?? "📦"}</Text>
                            <Text style={styles.cardName}>{item}</Text>
                            <View style={styles.cardArrow}>
                                <Text style={styles.cardArrowText}>→</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
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
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 32,
    },
    brand: {
        fontSize: 42,
        fontWeight: "900",
        color: C.lime,
        letterSpacing: -2,
        textTransform: "lowercase",
    },
    welcome: {
        fontSize: 13,
        color: C.textSub,
        marginTop: 2,
    },
    logoutBtn: {
        backgroundColor: C.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        width: 80, height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    logoutIcon: { fontSize: 18, color: C.lime },

    sectionLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    sectionLine:  { flex: 1, height: 1, backgroundColor: C.border },
    sectionLabel: {
        color: C.textSub,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 2,
        marginHorizontal: 12,
    },

    grid: { paddingBottom: 32 },
    card: {
        flex: 1,
        margin: 6,
        backgroundColor: C.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    cardIcon: { fontSize: 38 },
    cardName: {
        fontSize: 13,
        fontWeight: "600",
        color: C.textPrimary,
        textTransform: "capitalize",
        textAlign: "center",
    },
    cardArrow: {
        marginTop: 4,
        backgroundColor: C.border,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    cardArrowText: {
        color: C.lime,
        fontSize: 13,
        fontWeight: "700",
    },

    errorText: { fontSize: 16, color: "#FF3B5C", marginBottom: 16 },
    retryBtn:  { backgroundColor: C.lime, padding: 12, borderRadius: 8 },
    retryText: { color: "#000", fontWeight: "bold" },
});
import { useEffect, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert,
    StatusBar
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CategoryService } from "../../api/category-service";
import { TechCategory } from "../../types/Product";
import { AuthService } from "../../api/auth-service";
import { useTheme } from "../../theme";

// ── Icone per categoria ───────────────────────────────────────
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    smartphone: "phone-portrait-outline",
    laptop: "laptop-outline",
    tablet: "tablet-portrait-outline",
    monitor: "desktop-outline",
    cpu: "hardware-chip-outline",
    gpu: "film-outline",
    headphones: "headset-outline",
    smartwatch: "watch-outline",
    console: "game-controller-outline",
    router: "wifi-outline",
};

export default function Home() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const categoryService = new CategoryService();

    const [categories, setCategories] = useState<TechCategory[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [userName, setUserName] = useState<string>("");

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
                    text: "Esci", style: "destructive",
                    onPress: async function () {
                        await AuthService.logout();
                        router.replace("/login");
                    }
                }
            ]
        );
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
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textDim} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadCategories} style={s.retryBtn}>
                <Text style={s.retryText}>Riprova</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={s.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* ── Header ───────────────────────────────────── */}
            <View style={s.header}>
                <View>
                    <Text style={s.brand}>versus</Text>
                    {userName !== "" && (
                        <Text style={s.welcome}>Ciao, {userName}</Text>
                    )}
                </View>
                <TouchableOpacity onPress={handleLogout} style={s.iconBtn} activeOpacity={0.7}>
                    <Ionicons name="log-out-outline" size={22} color={colors.textSub} />
                </TouchableOpacity>
            </View>

            {/* ── Sezione label ─────────────────────────────── */}
            <View style={s.sectionRow}>
                <View style={s.sectionLine} />
                <Text style={s.sectionLabel}>CATEGORIE</Text>
                <View style={s.sectionLine} />
            </View>

            {/* ── Griglia categorie ─────────────────────────── */}
            <FlatList
                data={categories}
                keyExtractor={(item) => item}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.grid}
                columnWrapperStyle={{ gap: 12 }}
                renderItem={function ({ item }) {
                    const iconName = CATEGORY_ICONS[item] ?? "cube-outline";
                    return (
                        <TouchableOpacity
                            style={s.card}
                            onPress={function () {
                                router.push({ pathname: "/search", params: { category: item } });
                            }}
                            activeOpacity={0.75}
                        >
                            {/* Icona categoria */}
                            <View style={s.cardIconWrapper}>
                                <Ionicons name={iconName} size={30} color={colors.lime} />
                            </View>

                            {/* Nome */}
                            <Text style={s.cardName}>{item}</Text>

                            {/* Freccia */}
                            <View style={s.cardFooter}>
                                <Text style={s.cardFooterText}>Esplora</Text>
                                <Ionicons name="arrow-forward" size={14} color={colors.lime} />
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
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
            gap: 16,
        },

        // Header
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
        },
        brand: {
            fontSize: 46,
            fontWeight: "900",
            color: C.lime,
            letterSpacing: -2,
            textTransform: "lowercase",
            lineHeight: 50,
        },
        welcome: {
            fontSize: 14,
            color: C.textSub,
            marginTop: 2,
            fontWeight: "500",
        },
        iconBtn: {
            backgroundColor: C.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.border,
            width: 46,
            height: 46,
            justifyContent: "center",
            alignItems: "center",
        },

        // Section label
        sectionRow: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
        },
        sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
        sectionLabel: {
            color: C.textSub,
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 2.5,
            marginHorizontal: 14,
        },

        // Griglia
        grid: { paddingBottom: 40, gap: 12 },

        card: {
            flex: 1,
            backgroundColor: C.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            padding: 18,
            gap: 10,
        },

        cardIconWrapper: {
            backgroundColor: C.limeFaint,
            borderRadius: 14,
            width: 52,
            height: 52,
            justifyContent: "center",
            alignItems: "center",
        },

        cardName: {
            fontSize: 15,
            fontWeight: "700",
            color: C.textPrimary,
            textTransform: "capitalize",
        },

        cardFooter: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 2,
        },
        cardFooterText: {
            fontSize: 12,
            color: C.lime,
            fontWeight: "600",
        },

        // Errori
        errorText: {
            fontSize: 15,
            color: C.red,
            textAlign: "center",
            paddingHorizontal: 32,
        },
        retryBtn: {
            backgroundColor: C.lime,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
        },
        retryText: { color: C.textInverse, fontWeight: "700", fontSize: 15 },
    });
}
import { useCallback, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, StatusBar
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../../theme";
import { HistoryService, CompareHistory } from "../../api/history-service";

export default function History() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const historyService = new HistoryService();

    const s = makeStyles(colors);

    const [history, setHistory] = useState<CompareHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useFocusEffect(
        useCallback(function () {
            load();
        }, [])
    );

    async function load() {
        setLoading(true);
        setError("");
        try {
            const data = await historyService.getHistory();
            setHistory(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        try {
            await historyService.deleteHistory(id);
            setHistory(function (prev) {
                return prev.filter(function (h) { return h._id !== id; });
            });
        } catch (err: any) {
            setError(err.message);
        }
    }

    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString("it-IT", {
            day: "2-digit", month: "short", year: "numeric"
        });
    }

    if (loading) return (
        <View style={s.centered}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ActivityIndicator size="large" color={colors.lime} />
        </View>
    );

    return (
        <View style={s.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={s.header}>
                <Text style={s.title}>Storico</Text>
                <Text style={s.count}>
                    {history.length > 0 ? `${history.length} confronti` : ""}
                </Text>
            </View>

            <View style={s.sectionLabelRow}>
                <View style={s.sectionLine} />
                <Text style={s.sectionLabel}>I TUOI CONFRONTI</Text>
                <View style={s.sectionLine} />
            </View>

            {error !== "" && <Text style={s.errorText}>{error}</Text>}

            <FlatList
                data={history}
                keyExtractor={function (item) { return item._id; }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                    <View style={s.emptyContainer}>
                        <Text style={s.emptyIcon}>⊙</Text>
                        <Text style={s.emptyTitle}>Nessun confronto</Text>
                        <Text style={s.emptyText}>
                            I tuoi confronti appariranno qui dopo averli effettuati
                        </Text>
                        <TouchableOpacity
                            style={s.exploreBtn}
                            onPress={() => router.push("/home")}
                        >
                            <Text style={s.exploreBtnText}>Inizia a confrontare →</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={function ({ item }) {
                    const [p1, p2] = item.compareResponse.products;
                    const winner = item.compareResponse.geminiAnalysis.winner === 1 ? p1 : p2;
                    const loser = item.compareResponse.geminiAnalysis.winner === 1 ? p2 : p1;

                    return (
                        // ── Tap sulla card → apre compare con i dati salvati
                        <TouchableOpacity
                            style={s.card}
                            onPress={function () {
                                router.push({
                                    pathname: "/compare",
                                    params: { historyId: item._id }
                                });
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={s.cardHeader}>
                                <View style={s.categoryTag}>
                                    <Text style={s.categoryTagText}>{p1.category}</Text>
                                </View>
                                <Text style={s.dateText}>{formatDate(item.createdAt)}</Text>
                            </View>

                            <View style={s.productsRow}>
                                <View style={[s.productBox, s.productBoxWinner]}>
                                    <View style={s.winnerBadge}>
                                        <Text style={s.winnerBadgeText}>✦ VINCE</Text>
                                    </View>
                                    <Text style={s.productBrand}>{winner.brand.toUpperCase()}</Text>
                                    <Text style={s.productName} numberOfLines={2}>{winner.name}</Text>
                                    <Text style={s.productScore}>
                                        {item.compareResponse.geminiAnalysis.winner === 1 ? item.compareResponse.geminiAnalysis.score1 : item.compareResponse.geminiAnalysis.score2}
                                        <Text style={s.productScoreSub}>/100</Text>
                                    </Text>
                                </View>

                                <View style={s.vsCol}>
                                    <Text style={s.vsText}>VS</Text>
                                </View>

                                <View style={s.productBox}>
                                    <Text style={s.productBrand}>{loser.brand.toUpperCase()}</Text>
                                    <Text style={s.productName} numberOfLines={2}>{loser.name}</Text>
                                    <Text style={[s.productScore, { color: colors.textSub }]}>
                                        {item.compareResponse.geminiAnalysis.winner === 1 ? item.compareResponse.geminiAnalysis.score2 : item.compareResponse.geminiAnalysis.score1}
                                        <Text style={s.productScoreSub}>/100</Text>
                                    </Text>
                                </View>
                            </View>

                            <View style={s.verdictBox}>
                                <Text style={s.verdictIcon}>✦</Text>
                                <Text style={s.verdictText} numberOfLines={2}>
                                    {item.compareResponse.geminiAnalysis.verdict}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={s.deleteBtn}
                                onPress={function (e) {
                                    e.stopPropagation(); // non aprire compare al tap su elimina
                                    handleDelete(item._id);
                                }}
                            >
                                <Text style={s.deleteBtnText}>Elimina</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

function makeStyles(C: ReturnType<typeof useTheme>["colors"]) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 60 },
        centered: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },

        header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
        title: { fontSize: 36, fontWeight: "900", color: C.lime, letterSpacing: -1 },
        count: { fontSize: 13, color: C.textSub, marginBottom: 4 },

        sectionLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
        sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
        sectionLabel: { color: C.textSub, fontSize: 11, fontWeight: "700", letterSpacing: 2, marginHorizontal: 12 },

        card: {
            backgroundColor: C.card, borderRadius: 16,
            borderWidth: 1, borderColor: C.border,
            marginBottom: 12, overflow: "hidden",
        },
        cardHeader: {
            flexDirection: "row", justifyContent: "space-between",
            alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
            borderBottomWidth: 1, borderBottomColor: C.border,
        },
        categoryTag: { backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
        categoryTagText: { color: C.textSub, fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
        dateText: { color: C.textDim, fontSize: 11 },

        productsRow: { flexDirection: "row", padding: 14, gap: 8 },
        productBox: { flex: 1, gap: 4 },
        productBoxWinner: {
            backgroundColor: C.slotSelected, borderRadius: 12,
            borderWidth: 1, borderColor: C.limeDim, padding: 10,
        },
        winnerBadge: { alignSelf: "flex-start", backgroundColor: C.lime, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
        winnerBadgeText: { color: C.textInverse, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
        productBrand: { fontSize: 9, color: C.textSub, letterSpacing: 1.5 },
        productName: { fontSize: 13, fontWeight: "700", color: C.textPrimary, lineHeight: 18 },
        productScore: { fontSize: 22, fontWeight: "900", color: C.lime, marginTop: 4 },
        productScoreSub: { fontSize: 12, fontWeight: "400", color: C.limeDim },

        vsCol: { width: 28, alignItems: "center", justifyContent: "center" },
        vsText: { color: C.textDim, fontSize: 11, fontWeight: "800", letterSpacing: 1 },

        verdictBox: {
            flexDirection: "row", gap: 8, alignItems: "flex-start",
            paddingHorizontal: 16, paddingBottom: 14,
        },
        verdictIcon: { color: C.lime, fontSize: 12, marginTop: 2 },
        verdictText: { flex: 1, color: C.textSub, fontSize: 12, lineHeight: 18 },

        deleteBtn: { borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 10, alignItems: "center" },
        deleteBtnText: { color: C.red, fontSize: 13, fontWeight: "600" },

        emptyContainer: { alignItems: "center", marginTop: 80, gap: 12 },
        emptyIcon: { fontSize: 52, color: C.textDim },
        emptyTitle: { fontSize: 20, fontWeight: "700", color: C.textPrimary },
        emptyText: { fontSize: 14, color: C.textSub, textAlign: "center", lineHeight: 21, paddingHorizontal: 32 },
        exploreBtn: { marginTop: 8, backgroundColor: C.lime, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
        exploreBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },

        errorText: { color: C.red, fontSize: 13, textAlign: "center", marginBottom: 12 },
    });
}
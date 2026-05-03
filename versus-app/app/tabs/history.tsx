import { useCallback, useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, StatusBar
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { HistoryService, CompareHistory } from "../../api/history-service";

const C = {
    bg:          "#08080F",
    card:        "#111118",
    border:      "#1C1C2E",
    lime:        "#C8F135",
    limeDim:     "#8AAF22",
    red:         "#FF3B5C",
    textPrimary: "#EEEEF8",
    textSub:     "#7070A0",
    textDim:     "#3A3A5C",
};

export default function History() {
    const router = useRouter();
    const historyService = new HistoryService();

    const [history, setHistory] = useState<CompareHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState("");

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
        <View style={styles.centered}>
            <StatusBar barStyle="light-content" />
            <ActivityIndicator size="large" color={C.lime} />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* ── Header ───────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.title}>Storico</Text>
                <Text style={styles.count}>
                    {history.length > 0 ? `${history.length} confronti` : ""}
                </Text>
            </View>

            <View style={styles.sectionLabelRow}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionLabel}>I TUOI CONFRONTI</Text>
                <View style={styles.sectionLine} />
            </View>

            {error !== "" && <Text style={styles.errorText}>{error}</Text>}

            <FlatList
                data={history}
                keyExtractor={function (item) { return item._id; }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>⊙</Text>
                        <Text style={styles.emptyTitle}>Nessun confronto</Text>
                        <Text style={styles.emptyText}>
                            I tuoi confronti appariranno qui dopo averli effettuati
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreBtn}
                            onPress={() => router.push("/")}
                        >
                            <Text style={styles.exploreBtnText}>Inizia a confrontare →</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={function ({ item }) {
                    const [p1, p2] = item.products;
                    const winner   = item.analysis.winner === 1 ? p1 : p2;
                    const loser    = item.analysis.winner === 1 ? p2 : p1;

                    return (
                        <View style={styles.card}>

                            {/* Data + categoria */}
                            <View style={styles.cardHeader}>
                                <View style={styles.categoryTag}>
                                    <Text style={styles.categoryTagText}>{p1.category}</Text>
                                </View>
                                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                            </View>

                            {/* Prodotti */}
                            <View style={styles.productsRow}>
                                {/* Vincitore */}
                                <View style={[styles.productBox, styles.productBoxWinner]}>
                                    <View style={styles.winnerBadge}>
                                        <Text style={styles.winnerBadgeText}>✦ VINCE</Text>
                                    </View>
                                    <Text style={styles.productBrand}>{winner.brand.toUpperCase()}</Text>
                                    <Text style={styles.productName} numberOfLines={2}>{winner.name}</Text>
                                    <Text style={styles.productScore}>
                                        {item.analysis.winner === 1 ? item.analysis.score1 : item.analysis.score2}
                                        <Text style={styles.productScoreSub}>/100</Text>
                                    </Text>
                                </View>

                                <View style={styles.vsCol}>
                                    <Text style={styles.vsText}>VS</Text>
                                </View>

                                {/* Perdente */}
                                <View style={styles.productBox}>
                                    <Text style={styles.productBrand}>{loser.brand.toUpperCase()}</Text>
                                    <Text style={styles.productName} numberOfLines={2}>{loser.name}</Text>
                                    <Text style={[styles.productScore, { color: C.textSub }]}>
                                        {item.analysis.winner === 1 ? item.analysis.score2 : item.analysis.score1}
                                        <Text style={styles.productScoreSub}>/100</Text>
                                    </Text>
                                </View>
                            </View>

                            {/* Verdict */}
                            <View style={styles.verdictBox}>
                                <Text style={styles.verdictIcon}>✦</Text>
                                <Text style={styles.verdictText} numberOfLines={2}>
                                    {item.analysis.verdict}
                                </Text>
                            </View>

                            {/* Footer */}
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={function () { handleDelete(item._id); }}
                            >
                                <Text style={styles.deleteBtnText}>Elimina</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 60 },
    centered:  { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },

    header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
    title:   { fontSize: 36, fontWeight: "900", color: C.lime, letterSpacing: -1 },
    count:   { fontSize: 13, color: C.textSub, marginBottom: 4 },

    sectionLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    sectionLine:     { flex: 1, height: 1, backgroundColor: C.border },
    sectionLabel:    { color: C.textSub, fontSize: 11, fontWeight: "700", letterSpacing: 2, marginHorizontal: 12 },

    // Card storico
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
    categoryTag:     { backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    categoryTagText: { color: C.textSub, fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
    dateText:        { color: C.textDim, fontSize: 11 },

    // Prodotti affiancati
    productsRow: { flexDirection: "row", padding: 14, gap: 8 },
    productBox:  { flex: 1, gap: 4 },
    productBoxWinner: {
        backgroundColor: "#0C1A0A", borderRadius: 12,
        borderWidth: 1, borderColor: C.limeDim,
        padding: 10,
    },
    winnerBadge:     { alignSelf: "flex-start", backgroundColor: C.lime, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
    winnerBadgeText: { color: "#000", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
    productBrand:    { fontSize: 9, color: C.textSub, letterSpacing: 1.5 },
    productName:     { fontSize: 13, fontWeight: "700", color: C.textPrimary, lineHeight: 18 },
    productScore:    { fontSize: 22, fontWeight: "900", color: C.lime, marginTop: 4 },
    productScoreSub: { fontSize: 12, fontWeight: "400", color: C.limeDim },

    vsCol:  { width: 28, alignItems: "center", justifyContent: "center" },
    vsText: { color: C.textDim, fontSize: 11, fontWeight: "800", letterSpacing: 1 },

    // Verdict
    verdictBox: {
        flexDirection: "row", gap: 8, alignItems: "flex-start",
        paddingHorizontal: 16, paddingBottom: 14,
    },
    verdictIcon: { color: C.lime, fontSize: 12, marginTop: 2 },
    verdictText: { flex: 1, color: C.textSub, fontSize: 12, lineHeight: 18 },

    // Delete
    deleteBtn:     { borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 10, alignItems: "center" },
    deleteBtnText: { color: C.red, fontSize: 13, fontWeight: "600" },

    // Empty
    emptyContainer: { alignItems: "center", marginTop: 80, gap: 12 },
    emptyIcon:      { fontSize: 52, color: C.textDim },
    emptyTitle:     { fontSize: 20, fontWeight: "700", color: C.textPrimary },
    emptyText:      { fontSize: 14, color: C.textSub, textAlign: "center", lineHeight: 21, paddingHorizontal: 32 },
    exploreBtn:     { marginTop: 8, backgroundColor: C.lime, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
    exploreBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },

    errorText: { color: C.red, fontSize: 13, textAlign: "center", marginBottom: 12 },
});
import { useEffect, useState, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Animated, StatusBar
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CompareService } from "../api/compare-service";
import { HistoryService } from "../api/history-service";
import { Product } from "../types/Product";
import { useTheme } from "../theme";

interface GeminiAnalysis {
    score1: number; score2: number;
    pros1: string[]; pros2: string[];
    cons1: string[]; cons2: string[];
    winner: 1 | 2;
    verdict: string;
}

export default function Compare() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { id1, id2, historyId } = useLocalSearchParams<{
        id1?: string; id2?: string; historyId?: string;
    }>();

    const compareService = new CompareService();
    const historyService = new HistoryService();

    const [product1, setProduct1] = useState<Product | null>(null);
    const [product2, setProduct2] = useState<Product | null>(null);
    const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState("Caricamento...");
    const [isFromHistory, setIsFromHistory] = useState(false);
    const [error, setError] = useState("");

    const score1Anim = useRef(new Animated.Value(0)).current;
    const score2Anim = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(function () {
        if (historyId) {
            runFromHistory(historyId);
        } else if (id1 && id2) {
            runLive(id1, id2);
        } else {
            setError("Parametri mancanti");
            setLoading(false);
        }
    }, []);

    async function runFromHistory(hId: string) {
        setIsFromHistory(true);
        setLoadingMsg("Caricamento confronto...");
        try {
            const entry = await historyService.getHistoryById(hId);
            setProduct1(entry.compareResponse.products[0]);
            setProduct2(entry.compareResponse.products[1]);
            setAnalysis(entry.compareResponse.geminiAnalysis);
            animateScores(entry.compareResponse.geminiAnalysis.score1, entry.compareResponse.geminiAnalysis.score2);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function runLive(i1: string, i2: string) {
        setIsFromHistory(false);
        try {
            setLoadingMsg("Recupero prodotti...");
            await new Promise((r) => setTimeout(r, 600));
            setLoadingMsg("Analisi AI in corso...");
            const res = await compareService.compareProducts([i1, i2]);
            setProduct1(res.products[0]);
            setProduct2(res.products[1]);
            setAnalysis(res.geminiAnalysis);
            animateScores(res.geminiAnalysis.score1, res.geminiAnalysis.score2);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function animateScores(s1: number, s2: number) {
        Animated.parallel([
            Animated.timing(score1Anim, { toValue: s1, duration: 1200, useNativeDriver: false }),
            Animated.timing(score2Anim, { toValue: s2, duration: 1200, useNativeDriver: false }),
            Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]).start();
    }

    const s = makeStyles(colors);

    if (loading) return (
        <View style={s.loadingContainer}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ActivityIndicator size="large" color={colors.lime} />
            <Text style={s.loadingMsg}>{loadingMsg}</Text>
            {!isFromHistory && (
                <Text style={s.loadingHint}>Gemini sta cercando e analizzando...</Text>
            )}
        </View>
    );

    if (error || !product1 || !product2 || !analysis) return (
        <View style={s.loadingContainer}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Ionicons name="alert-circle-outline" size={48} color={colors.red} />
            <Text style={s.errorText}>{error || "Qualcosa è andato storto."}</Text>
            <TouchableOpacity onPress={() => router.navigate("/home")} style={s.backBtnError}>
                <Text style={s.backBtnErrorText}>Torna indietro</Text>
            </TouchableOpacity>
        </View>
    );

    const w = analysis.winner;
    const allSpecKeys = Array.from(new Set([
        ...Object.keys(product1.specs ?? {}),
        ...Object.keys(product2.specs ?? {}),
    ]));

    return (
        <View style={s.root}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Top bar ──────────────────────────────── */}
                <View style={s.topRow}>
                    <TouchableOpacity onPress={() => router.back()} style={s.topBackBtn}>
                        <Ionicons name="arrow-back" size={20} color={colors.textSub} />
                        <Text style={s.topBackLabel}>
                            {isFromHistory ? "Storico" : "Confronto"}
                        </Text>
                    </TouchableOpacity>
                    {isFromHistory && (
                        <View style={s.historyBadge}>
                            <Ionicons name="time-outline" size={12} color={colors.textSub} />
                            <Text style={s.historyBadgeText}>SALVATO</Text>
                        </View>
                    )}
                </View>

                {/* ── Header duale punteggi ─────────────────── */}
                <View style={s.header}>
                    <ProductHeader colors={colors} product={product1} isWinner={w === 1} scoreAnim={score1Anim} align="left" />
                    <View style={s.vsColumn}>
                        <Text style={s.vsText}>VS</Text>
                    </View>
                    <ProductHeader colors={colors} product={product2} isWinner={w === 2} scoreAnim={score2Anim} align="right" />
                </View>

                <Animated.View style={{ opacity: fadeIn }}>

                    {/* ── Specifiche ───────────────────────── */}
                    <SectionLabel colors={colors} text="SPECIFICHE" icon="list-outline" />
                    <View style={s.specsCard}>
                        {allSpecKeys.map(function (key, i) {
                            const v1 = product1?.specs?.[key as keyof typeof product1.specs] ?? "—";
                            const v2 = product2?.specs?.[key as keyof typeof product2.specs] ?? "—";
                            return (
                                <View key={key} style={[s.specRow, i > 0 && s.specRowBorder]}>
                                    <Text style={s.specValue} numberOfLines={2}>{String(v1)}</Text>
                                    <Text style={s.specKey}>{key}</Text>
                                    <Text style={[s.specValue, s.specValueRight]} numberOfLines={2}>{String(v2)}</Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* ── Pro & Contro ─────────────────────── */}
                    <SectionLabel colors={colors} text="PRO & CONTRO" icon="stats-chart-outline" />
                    <View style={s.proConRow}>
                        <ProConCard colors={colors} name={product1.name} pros={analysis.pros1} cons={analysis.cons1} isWinner={w === 1} />
                        <ProConCard colors={colors} name={product2.name} pros={analysis.pros2} cons={analysis.cons2} isWinner={w === 2} />
                    </View>

                    {/* ── Verdetto AI ──────────────────────── */}
                    <SectionLabel colors={colors} text="VERDETTO AI" icon="sparkles-outline" />
                    <View style={s.verdictCard}>
                        <View style={s.verdictHeader}>
                            <Ionicons name="trophy-outline" size={20} color={colors.lime} />
                            <Text style={s.verdictWinnerLabel}>
                                Vincitore:{" "}
                                <Text style={s.verdictWinnerName}>
                                    {w === 1 ? product1.name : product2.name}
                                </Text>
                            </Text>
                        </View>
                        <Text style={s.verdictText}>{analysis.verdict}</Text>
                    </View>

                    {/* ── Prezzi ───────────────────────────── */}
                    <SectionLabel colors={colors} text="PREZZI" icon="pricetag-outline" />
                    <View style={s.priceRow}>
                        <PriceCard colors={colors} product={product1} isWinner={w === 1} />
                        <PriceCard colors={colors} product={product2} isWinner={w === 2} />
                    </View>

                    <View style={{ height: 48 }} />
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Sub-componenti ───────────────────────────────────────────

function ProductHeader({ colors, product, isWinner, scoreAnim, align }: {
    colors: any; product: Product; isWinner: boolean;
    scoreAnim: Animated.Value; align: "left" | "right";
}) {
    const displayScore = scoreAnim.interpolate({ inputRange: [0, 100], outputRange: ["0", "100"] });
    return (
        <View style={[{ flex: 1 }, align === "right" && { alignItems: "flex-end" }]}>
            {isWinner && (
                <View style={[{
                    backgroundColor: colors.lime, borderRadius: 6,
                    paddingHorizontal: 8, paddingVertical: 4,
                    flexDirection: "row", alignItems: "center", gap: 4,
                    alignSelf: "flex-start", marginBottom: 8,
                }, align === "right" && { alignSelf: "flex-end" }]}>
                    <Ionicons name="trophy" size={10} color={colors.textInverse} />
                    <Text style={{ color: colors.textInverse, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>VINCE</Text>
                </View>
            )}
            <Text style={[{ color: colors.textSub, fontSize: 11, letterSpacing: 2, marginBottom: 4, fontWeight: "600" },
            align === "right" && { textAlign: "right" }]}>
                {product.brand.toUpperCase()}
            </Text>
            <Text style={[{ color: colors.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 10, lineHeight: 21 },
            align === "right" && { textAlign: "right" }]}
                numberOfLines={2}>
                {product.name}
            </Text>
            <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: 2 },
            align === "right" && { justifyContent: "flex-end" }]}>
                <Animated.Text style={{ fontSize: 50, fontWeight: "900", lineHeight: 54, color: isWinner ? colors.lime : colors.textPrimary }}>
                    {displayScore}
                </Animated.Text>
                <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 5, color: isWinner ? colors.limeDim : colors.textDim }}>/100</Text>
            </View>
        </View>
    );
}

function ProConCard({ colors, name, pros, cons, isWinner }: {
    colors: any; name: string; pros: string[]; cons: string[]; isWinner: boolean;
}) {
    return (
        <View style={{
            flex: 1, backgroundColor: colors.card, borderRadius: 16,
            borderWidth: 1, borderColor: isWinner ? colors.limeDim : colors.border,
            padding: 14, gap: 8, overflow: "hidden",
        }}>
            {isWinner && <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.lime }} />}
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "700", marginBottom: 2 }} numberOfLines={1}>{name}</Text>
            {pros.map(function (p, i) {
                return (
                    <View key={`p${i}`} style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
                        <Ionicons name="arrow-up-circle" size={15} color={colors.lime} style={{ marginTop: 1 }} />
                        <Text style={{ color: colors.textPrimary, fontSize: 12, flex: 1, lineHeight: 17 }}>{p}</Text>
                    </View>
                );
            })}
            {cons.map(function (c, i) {
                return (
                    <View key={`c${i}`} style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
                        <Ionicons name="arrow-down-circle" size={15} color={colors.red} style={{ marginTop: 1 }} />
                        <Text style={{ color: colors.textSub, fontSize: 12, flex: 1, lineHeight: 17 }}>{c}</Text>
                    </View>
                );
            })}
        </View>
    );
}

function PriceCard({ colors, product, isWinner }: { colors: any; product: Product; isWinner: boolean }) {
    return (
        <View style={{
            flex: 1, backgroundColor: colors.card, borderRadius: 16,
            borderWidth: 1, borderColor: isWinner ? colors.limeDim : colors.border,
            padding: 16, alignItems: "center", gap: 6,
        }}>
            {isWinner && <Ionicons name="checkmark-circle" size={18} color={colors.lime} />}
            <Text style={{ color: colors.textSub, fontSize: 11, textAlign: "center" }} numberOfLines={1}>{product.name}</Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: isWinner ? colors.lime : colors.textPrimary }}>€ {product.price}</Text>
        </View>
    );
}

function SectionLabel({ colors, text, icon }: { colors: any; text: string; icon: keyof typeof Ionicons.glyphMap }) {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, marginTop: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 12 }}>
                <Ionicons name={icon} size={13} color={colors.textSub} />
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: "700", letterSpacing: 2 }}>{text}</Text>
            </View>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>
    );
}

function makeStyles(C: ReturnType<typeof useTheme>["colors"]) {
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: C.bg },
        scroll: { padding: 20, paddingTop: 56 },

        loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", gap: 16 },
        loadingMsg: { color: C.textPrimary, fontSize: 17, fontWeight: "600" },
        loadingHint: { color: C.textSub, fontSize: 14 },
        errorText: { color: C.red, fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
        backBtnError: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
        backBtnErrorText: { color: C.textSub, fontSize: 14, fontWeight: "600" },

        topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
        topBackBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
        topBackLabel: { color: C.textSub, fontSize: 13, fontWeight: "600", letterSpacing: 0.5 },
        historyBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 6 },
        historyBadgeText: { color: C.textSub, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },

        header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 32 },
        vsColumn: { width: 40, alignItems: "center", paddingTop: 40 },
        vsText: { color: C.textDim, fontSize: 13, fontWeight: "800", letterSpacing: 2 },

        specsCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 24, overflow: "hidden" },
        specRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16 },
        specRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
        specKey: { flex: 1, color: C.textSub, fontSize: 11, textAlign: "center", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: "600" },
        specValue: { flex: 1.4, color: C.textPrimary, fontSize: 13, fontWeight: "500" },
        specValueRight: { textAlign: "right" },

        proConRow: { flexDirection: "row", gap: 10, marginBottom: 24 },

        verdictCard: { backgroundColor: C.aiCard, borderRadius: 16, borderWidth: 1, borderColor: C.aiBorder, padding: 20, marginBottom: 24, gap: 12 },
        verdictHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
        verdictWinnerLabel: { color: C.textSub, fontSize: 14, flex: 1 },
        verdictWinnerName: { color: C.lime, fontWeight: "700" },
        verdictText: { color: C.textPrimary, fontSize: 15, lineHeight: 24 },

        priceRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
    });
}
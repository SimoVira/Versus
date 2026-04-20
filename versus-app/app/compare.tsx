import { useEffect, useState, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Animated, StatusBar
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CompareService } from "../api/compare-service";
import { CompareResponse, Product } from "../types/Product";

// ─── Palette ──────────────────────────────────────────────────
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
    aiCard: "#0C1410",
    aiBorder: "#2A4020",
};

// ─── Tipo risposta dal server ─────────────────────────────────


export default function Compare() {
    const router = useRouter();
    const { id1, id2 } = useLocalSearchParams<{ id1: string; id2: string }>();
    const compareService = new CompareService();

    const [product1, setProduct1] = useState<Product | null>(null);
    const [product2, setProduct2] = useState<Product | null>(null);
    const [geminiAnalysis, setGeminiAnalysis] = useState<CompareResponse["geminiAnalysis"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState("Recupero prodotti...");
    const [error, setError] = useState("");

    const score1Anim = useRef(new Animated.Value(0)).current;
    const score2Anim = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    const hasFetched = useRef(false); // ✅ blocca la doppia chiamata in Strict Mode
    useEffect(function () {
        if (hasFetched.current) return; // se già chiamato, esci (non vengono fatte due chiamate, 
        //perchè in development monta due volte il componente per evidenziare problemi di side effect, 
        //ma noi vogliamo che la chiamata API avvenga una sola volta)
        hasFetched.current = true;
        run();
    }, []);

    async function run() {
        try {
            setLoadingMsg("Recupero prodotti...");
            await new Promise((r) => setTimeout(r, 600));

            setLoadingMsg("Analisi AI in corso...");
            const res: CompareResponse = await compareService.compareProducts([id1, id2]);

            console.log("Risposta confronto:", res);
            setProduct1(res.products[0]);
            setProduct2(res.products[1]);
            setGeminiAnalysis(res.geminiAnalysis); //aggiorna ma è asincrono quindi in score1Anim e score2Anim 
            // non abbiamo ancora i dati dentro geminiAnalysis, perciò usiamo res.geminiAnalysis.score1

            Animated.parallel([
                Animated.timing(score1Anim, { toValue: res.geminiAnalysis.score1, duration: 1200, useNativeDriver: false }),
                Animated.timing(score2Anim, { toValue: res.geminiAnalysis.score2, duration: 1200, useNativeDriver: false }),
                Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }),
            ]).start();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <View style={styles.loadingContainer}>
            <StatusBar barStyle="light-content" />
            <ActivityIndicator size="large" color={C.lime} />
            <Text style={styles.loadingMsg}>{loadingMsg}</Text>
            <Text style={styles.loadingHint}>Gemini sta cercando e analizzando...</Text>
        </View>
    );

    if (error || !product1 || !product2 || !geminiAnalysis) return (
        <View style={styles.loadingContainer}>
            <StatusBar barStyle="light-content" />
            <Text style={styles.errorText}>{error || "Qualcosa è andato storto."}</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Torna indietro</Text>
            </TouchableOpacity>
        </View>
    );

    const w = geminiAnalysis.winner;
    const allSpecKeys = Array.from(new Set([
        ...Object.keys(product1.specs ?? {}),
        ...Object.keys(product2.specs ?? {}),
    ]));

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Back */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
                    <Text style={styles.backArrow}>←</Text>
                    <Text style={styles.backLabel}>Confronto</Text>
                </TouchableOpacity>

                {/* ── Header duale ─────────────────────────── */}
                <View style={styles.header}>
                    <ProductHeader
                        product={product1}
                        isWinner={w === 1}
                        scoreAnim={score1Anim}
                        align="left"
                    />
                    <View style={styles.vsColumn}>
                        <Text style={styles.vsText}>VS</Text>
                    </View>
                    <ProductHeader
                        product={product2}
                        isWinner={w === 2}
                        scoreAnim={score2Anim}
                        align="right"
                    />
                </View>

                <Animated.View style={{ opacity: fadeIn }}>

                    {/* ── Specifiche ───────────────────────── */}
                    <SectionLabel text="SPECIFICHE" />
                    <View style={styles.specsCard}>
                        {allSpecKeys.map(function (key, i) {
                            //la key dipende dalla categoria, quindi controlliamo il tipo di product1.specs (che può essere SmartwatchSpecs o GpuSpecs...) e 
                            //verifichiamo, per la conformità dei dati, se ha quella chiave che stiamo cercando il tipo di specs, se no mettiamo "—".
                            const v1 = product1?.specs?.[key as keyof typeof product1.specs] ?? "—";
                            const v2 = product2?.specs?.[key as keyof typeof product2.specs] ?? "—";
                            return (
                                <View key={key} style={[styles.specRow, i > 0 && styles.specRowBorder]}>
                                    <Text style={styles.specValue} numberOfLines={2}>{String(v1)}</Text>
                                    <Text style={styles.specKey}>{key}</Text>
                                    <Text style={[styles.specValue, styles.specValueRight]} numberOfLines={2}>{String(v2)}</Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* ── Pro & Contro ─────────────────────── */}
                    <SectionLabel text="PRO & CONTRO" />
                    <View style={styles.proConRow}>
                        <ProConCard
                            name={product1.name}
                            pros={geminiAnalysis.pros1}
                            cons={geminiAnalysis.cons1}
                            isWinner={w === 1}
                        />
                        <ProConCard
                            name={product2.name}
                            pros={geminiAnalysis.pros2}
                            cons={geminiAnalysis.cons2}
                            isWinner={w === 2}
                        />
                    </View>

                    {/* ── Verdetto AI ──────────────────────── */}
                    <SectionLabel text="VERDETTO AI" />
                    <View style={styles.verdictCard}>
                        <View style={styles.verdictHeader}>
                            <Text style={styles.verdictIcon}>✦</Text>
                            <Text style={styles.verdictWinnerLabel}>
                                Vincitore:{" "}
                                <Text style={styles.verdictWinnerName}>
                                    {w === 1 ? product1.name : product2.name}
                                </Text>
                            </Text>
                        </View>
                        <Text style={styles.verdictText}>{geminiAnalysis.verdict}</Text>
                    </View>

                    {/* ── Prezzi ───────────────────────────── */}
                    <SectionLabel text="PREZZI" />
                    <View style={styles.priceRow}>
                        <PriceCard product={product1} isWinner={w === 1} />
                        <PriceCard product={product2} isWinner={w === 2} />
                    </View>

                    <View style={{ height: 48 }} />
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Sub-componenti ───────────────────────────────────────────

function ProductHeader({ product, isWinner, scoreAnim, align }: {
    product: Product;
    isWinner: boolean;
    scoreAnim: Animated.Value;
    align: "left" | "right";
}) {
    const displayScore = scoreAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ["0", "100"],
    });

    return (
        <View style={[styles.productHeaderCol, align === "right" && styles.productHeaderRight]}>
            {isWinner && (
                <View style={[styles.winnerTag, align === "right" && styles.winnerTagRight]}>
                    <Text style={styles.winnerTagText}>VINCITORE</Text>
                </View>
            )}
            <Text style={[styles.productBrand, align === "right" && styles.textRight]}>
                {product.brand.toUpperCase()}
            </Text>
            <Text style={[styles.productName, align === "right" && styles.textRight]} numberOfLines={2}>
                {product.name}
            </Text>
            <View style={[styles.scoreRow, align === "right" && styles.scoreRowRight]}>
                <Animated.Text style={[styles.scoreBig, { color: isWinner ? C.lime : C.textPrimary }]}>
                    {displayScore}
                </Animated.Text>
                <Text style={[styles.scoreSlash, { color: isWinner ? C.limeDim : C.textDim }]}>/100</Text>
            </View>
        </View>
    );
}

function ProConCard({ name, pros, cons, isWinner }: {
    name: string; pros: string[]; cons: string[]; isWinner: boolean;
}) {
    return (
        <View style={[styles.proConCard, isWinner && styles.proConCardWinner]}>
            {isWinner && <View style={styles.proConWinStripe} />}
            <Text style={styles.proConName} numberOfLines={1}>{name}</Text>
            {pros.map(function (p, i) {
                return (
                    <View key={`pro-${i}`} style={styles.proConLine}>
                        <Text style={styles.proIcon}>↑</Text>
                        <Text style={styles.proText}>{p}</Text>
                    </View>
                );
            })}
            {cons.map(function (c, i) {
                return (
                    <View key={`con-${i}`} style={styles.proConLine}>
                        <Text style={styles.conIcon}>↓</Text>
                        <Text style={styles.conText}>{c}</Text>
                    </View>
                );
            })}
        </View>
    );
}

function PriceCard({ product, isWinner }: { product: Product; isWinner: boolean }) {
    return (
        <View style={[styles.priceCard, isWinner && styles.priceCardWinner]}>
            <Text style={styles.priceName} numberOfLines={1}>{product.name}</Text>
            <Text style={[styles.priceAmount, { color: isWinner ? C.lime : C.textPrimary }]}>
                € {product.price}
            </Text>
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

// ─── Stili ────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { padding: 20, paddingTop: 56 },

    loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", gap: 16 },
    loadingMsg: { color: C.textPrimary, fontSize: 17, fontWeight: "600" },
    loadingHint: { color: C.textSub, fontSize: 13 },
    errorText: { color: C.red, fontSize: 16, textAlign: "center", paddingHorizontal: 32 },
    backBtn: { marginTop: 16, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnText: { color: C.textSub, fontSize: 14 },

    backRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 },
    backArrow: { color: C.textSub, fontSize: 20 },
    backLabel: { color: C.textSub, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase" },

    header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 36 },
    productHeaderCol: { flex: 1 },
    productHeaderRight: { alignItems: "flex-end" },
    textRight: { textAlign: "right" },

    winnerTag: { backgroundColor: C.lime, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 8 },
    winnerTagRight: { alignSelf: "flex-end" },
    winnerTagText: { color: "#000", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },

    productBrand: { color: C.textSub, fontSize: 11, letterSpacing: 2, marginBottom: 4 },
    productName: { color: C.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 10, lineHeight: 22 },

    scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
    scoreRowRight: { justifyContent: "flex-end" },
    scoreBig: { fontSize: 52, fontWeight: "900", lineHeight: 56 },
    scoreSlash: { fontSize: 16, fontWeight: "600", marginBottom: 6 },

    vsColumn: { width: 36, alignItems: "center", paddingTop: 36 },
    vsText: { color: C.textDim, fontSize: 12, fontWeight: "800", letterSpacing: 2 },

    sectionLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, marginTop: 4 },
    sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
    sectionLabel: { color: C.textSub, fontSize: 11, fontWeight: "700", letterSpacing: 2, marginHorizontal: 12 },

    specsCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 28, overflow: "hidden" },
    specRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16 },
    specRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    specKey: { flex: 1, color: C.textSub, fontSize: 11, textAlign: "center", letterSpacing: 0.5, textTransform: "uppercase" },
    specValue: { flex: 1.4, color: C.textPrimary, fontSize: 13, fontWeight: "500" },
    specValueRight: { textAlign: "right" },

    proConRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
    proConCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, gap: 8, overflow: "hidden" },
    proConCardWinner: { borderColor: C.limeDim },
    proConWinStripe: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: C.lime },
    proConName: { color: C.textPrimary, fontSize: 12, fontWeight: "700", marginBottom: 4 },
    proConLine: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
    proIcon: { color: C.lime, fontSize: 13, fontWeight: "800", marginTop: 1 },
    conIcon: { color: C.red, fontSize: 13, fontWeight: "800", marginTop: 1 },
    proText: { color: C.textPrimary, fontSize: 12, flex: 1, lineHeight: 17 },
    conText: { color: C.textSub, fontSize: 12, flex: 1, lineHeight: 17 },

    verdictCard: { backgroundColor: C.aiCard, borderRadius: 16, borderWidth: 1, borderColor: C.aiBorder, padding: 20, marginBottom: 28, gap: 12 },
    verdictHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    verdictIcon: { color: C.lime, fontSize: 18 },
    verdictWinnerLabel: { color: C.textSub, fontSize: 13 },
    verdictWinnerName: { color: C.lime, fontWeight: "700" },
    verdictText: { color: C.textPrimary, fontSize: 15, lineHeight: 24 },

    priceRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
    priceCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: "center", gap: 6 },
    priceCardWinner: { borderColor: C.limeDim },
    priceName: { color: C.textSub, fontSize: 11, textAlign: "center" },
    priceAmount: { fontSize: 26, fontWeight: "800" },
});
import { useState, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, Animated, StatusBar, ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { AuthService } from "../api/auth-service";

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
    inputBg: "#0E0E1A",
};

export default function Register() {
    const router = useRouter();
    const authService = new AuthService();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const shakeAnim = useRef(new Animated.Value(0)).current;

    function shake() {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }

    async function handleRegister() {
        if (!name.trim() || !email.trim() || !password || !confirm) {
            setError("Compila tutti i campi");
            shake();
            return;
        }
        if (password.length < 6) {
            setError("La password deve essere di almeno 6 caratteri");
            shake();
            return;
        }
        if (password !== confirm) {
            setError("Le password non coincidono");
            shake();
            return;
        }

        setLoading(true);
        setError("");

        try {
            await authService.register(name.trim(), email.trim().toLowerCase(), password);
            router.replace("/");
        } catch (err: any) {
            setError(err.message);
            shake();
        } finally {
            setLoading(false);
        }
    }

    // Indicatore forza password
    function passwordStrength(): { label: string; color: string; width: string } {
        if (password.length === 0) return { label: "", color: "transparent", width: "0%" };
        if (password.length < 6) return { label: "Debole", color: C.red, width: "30%" };
        if (password.length < 10) return { label: "Media", color: "#F5A623", width: "60%" };
        return { label: "Forte", color: C.lime, width: "100%" };
    }

    const strength = passwordStrength();

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <StatusBar barStyle="light-content" />
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
                    <Text style={styles.backArrow}>←</Text>
                    <Text style={styles.backLabel}>Accedi</Text>
                </TouchableOpacity>

                <View style={styles.brandArea}>
                    <Text style={styles.brandName}>versus</Text>
                    <Text style={styles.brandSub}>Crea il tuo account</Text>
                </View>

                {/* Form */}
                <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>

                    <Text style={styles.formTitle}>Registrati</Text>

                    {/* Nome */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>NOME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Il tuo nome"
                            placeholderTextColor={C.textDim}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Email */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>EMAIL</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="nome@email.com"
                            placeholderTextColor={C.textDim}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Password */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Minimo 6 caratteri"
                            placeholderTextColor={C.textDim}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        {/* Indicatore forza */}
                        {password.length > 0 && (
                            <View style={styles.strengthRow}>
                                <View style={styles.strengthBar}>
                                    <View style={[styles.strengthFill, {
                                        width: strength.width as any,
                                        backgroundColor: strength.color
                                    }]} />
                                </View>
                                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                                    {strength.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Conferma password */}
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>CONFERMA PASSWORD</Text>
                        <TextInput
                            style={[
                                styles.input,
                                confirm.length > 0 && confirm !== password && styles.inputError
                            ]}
                            placeholder="Ripeti la password"
                            placeholderTextColor={C.textDim}
                            value={confirm}
                            onChangeText={setConfirm}
                            secureTextEntry
                        />
                    </View>

                    {/* Errore */}
                    {error !== "" && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}

                    {/* Bottone registrazione */}
                    <TouchableOpacity
                        style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : <Text style={styles.registerBtnText}>Crea account</Text>
                        }
                    </TouchableOpacity>

                    {/* Già registrato */}
                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.loginLinkText}>
                            Hai già un account? <Text style={{ color: C.lime }}>Accedi</Text>
                        </Text>
                    </TouchableOpacity>

                </Animated.View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 28, paddingTop: 56 },

    backRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 32 },
    backArrow: { color: C.textSub, fontSize: 20 },
    backLabel: { color: C.textSub, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase" },

    brandArea: { alignItems: "center", marginBottom: 36 },
    brandName: {
        fontSize: 44,
        fontWeight: "900",
        color: C.lime,
        letterSpacing: -2,
        textTransform: "lowercase",
    },
    brandSub: { color: C.textSub, fontSize: 13, letterSpacing: 1, marginTop: 4 },

    form: {
        backgroundColor: C.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: C.border,
        padding: 28,
        gap: 16,
    },
    formTitle: { color: C.textPrimary, fontSize: 22, fontWeight: "700", marginBottom: 4 },

    inputWrapper: { gap: 6 },
    inputLabel: { color: C.textSub, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
    input: {
        backgroundColor: C.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: C.textPrimary,
        fontSize: 15,
    },
    inputError: { borderColor: C.red },

    // Forza password
    strengthRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
    strengthBar: { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: "hidden" },
    strengthFill: { height: "100%", borderRadius: 2 },
    strengthLabel: { fontSize: 11, fontWeight: "700", width: 50 },

    errorText: { color: C.red, fontSize: 13, textAlign: "center" },

    registerBtn: {
        backgroundColor: C.lime,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 4,
    },
    registerBtnDisabled: { opacity: 0.6 },
    registerBtnText: { color: "#000", fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },

    loginLink: { alignItems: "center", paddingVertical: 4 },
    loginLinkText: { color: C.textSub, fontSize: 14 },
});

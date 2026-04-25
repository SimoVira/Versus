import { useState, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, Animated, StatusBar
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

export default function Login() {
    const router = useRouter();
    const authService = new AuthService();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Shake animation per errore
    const shakeAnim = useRef(new Animated.Value(0)).current;

    function shake() {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }

    async function handleLogin() {
        if (!email.trim() || !password) {
            setError("Compila tutti i campi");
            shake();
            return;
        }

        setLoading(true);
        setError("");

        try {
            await authService.login(email.trim().toLowerCase(), password);
            router.replace("/");
        } catch (err: any) {
            setError(err.message);
            shake();
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <StatusBar barStyle="light-content" />

            {/* Logo / Brand */}
            <View style={styles.brandArea}>
                <Text style={styles.brandName}>versus</Text>
                <Text style={styles.brandSub}>Confronta. Scegli. Meglio.</Text>
            </View>

            {/* Form */}
            <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>

                <Text style={styles.formTitle}>Accedi</Text>

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
                        placeholder="••••••••"
                        placeholderTextColor={C.textDim}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {/* Errore */}
                {error !== "" && (
                    <Text style={styles.errorText}>{error}</Text>
                )}

                {/* Bottone login */}
                <TouchableOpacity
                    style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#000" />
                        : <Text style={styles.loginBtnText}>Entra</Text>
                    }
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>non hai un account?</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Vai a registrazione */}
                <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => router.push("/register")}
                    activeOpacity={0.7}
                >
                    <Text style={styles.registerBtnText}>Registrati</Text>
                </TouchableOpacity>

            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
        justifyContent: "center",
        paddingHorizontal: 28,
    },

    // Brand
    brandArea: { alignItems: "center", marginBottom: 52 },
    brandName: {
        fontSize: 52,
        fontWeight: "900",
        color: C.lime,
        letterSpacing: -2,
        textTransform: "lowercase",
    },
    brandSub: {
        color: C.textSub,
        fontSize: 13,
        letterSpacing: 1,
        marginTop: 4,
    },

    // Form
    form: {
        backgroundColor: C.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: C.border,
        padding: 28,
        gap: 16,
    },
    formTitle: {
        color: C.textPrimary,
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 4,
    },

    // Input
    inputWrapper: { gap: 6 },
    inputLabel: {
        color: C.textSub,
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 2,
    },
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

    // Errore
    errorText: {
        color: C.red,
        fontSize: 13,
        textAlign: "center",
    },

    // Bottone login
    loginBtn: {
        backgroundColor: C.lime,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 4,
    },
    loginBtnDisabled: { opacity: 0.6 },
    loginBtnText: {
        color: "#000",
        fontWeight: "800",
        fontSize: 16,
        letterSpacing: 0.5,
    },

    // Divider
    divider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginVertical: 4,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
    dividerText: { color: C.textSub, fontSize: 12 },

    // Bottone registrazione
    registerBtn: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
    },
    registerBtnText: {
        color: C.textPrimary,
        fontWeight: "600",
        fontSize: 15,
    },
});

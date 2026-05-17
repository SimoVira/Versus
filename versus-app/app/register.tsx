import { useState, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, Animated, StatusBar, ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthService } from "../api/auth-service";
import { useTheme } from "../theme";

export default function Register() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
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
            router.replace("/home");
        } catch (err: any) {
            setError(err.message);
            shake();
        } finally {
            setLoading(false);
        }
    }

    function passwordStrength(): { label: string; color: string; width: string } {
        if (password.length === 0) return { label: "", color: "transparent", width: "0%" };
        if (password.length < 6) return { label: "Debole", color: colors.red, width: "30%" };
        if (password.length < 10) return { label: "Media", color: "#FEDA00", width: "60%" };
        return { label: "Forte", color: colors.lime, width: "100%" };
    }

    const strength = passwordStrength();
    const s = makeStyles(colors);

    return (
        <KeyboardAvoidingView
            style={s.root}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScrollView
                contentContainerStyle={s.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity onPress={() => router.back()} style={s.backRow}>
                    <Ionicons name="arrow-back" size={22} color={colors.textSub} />
                    <Text style={s.backLabel}>Accedi</Text>
                </TouchableOpacity>

                <View style={s.brandArea}>
                    <Text style={s.brandName}>versus</Text>
                    <Text style={s.brandSub}>Crea il tuo account</Text>
                </View>

                <Animated.View style={[s.form, { transform: [{ translateX: shakeAnim }] }]}>

                    <Text style={s.formTitle}>Registrati</Text>

                    <View style={s.inputWrapper}>
                        <Text style={s.inputLabel}>NOME</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Il tuo nome"
                            placeholderTextColor={colors.textDim}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={s.inputWrapper}>
                        <Text style={s.inputLabel}>EMAIL</Text>
                        <TextInput
                            style={s.input}
                            placeholder="nome@email.com"
                            placeholderTextColor={colors.textDim}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={s.inputWrapper}>
                        <Text style={s.inputLabel}>PASSWORD</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Minimo 6 caratteri"
                            placeholderTextColor={colors.textDim}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        {password.length > 0 && (
                            <View style={s.strengthRow}>
                                <View style={s.strengthBar}>
                                    <View style={[s.strengthFill, {
                                        width: strength.width as any,
                                        backgroundColor: strength.color
                                    }]} />
                                </View>
                                <Text style={[s.strengthLabel, { color: strength.color }]}>
                                    {strength.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={s.inputWrapper}>
                        <Text style={s.inputLabel}>CONFERMA PASSWORD</Text>
                        <TextInput
                            style={[
                                s.input,
                                confirm.length > 0 && confirm !== password && s.inputError
                            ]}
                            placeholder="Ripeti la password"
                            placeholderTextColor={colors.textDim}
                            value={confirm}
                            onChangeText={setConfirm}
                            secureTextEntry
                        />
                    </View>

                    {error !== "" && (
                        <Text style={s.errorText}>{error}</Text>
                    )}

                    <TouchableOpacity
                        style={[s.registerBtn, loading && s.registerBtnDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color={colors.textInverse} />
                            : <Text style={s.registerBtnText}>Crea account</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.loginLink}
                        onPress={() => router.back()}
                    >
                        <Text style={s.loginLinkText}>
                            Hai già un account? <Text style={{ color: colors.lime }}>Accedi</Text>
                        </Text>
                    </TouchableOpacity>

                </Animated.View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function makeStyles(C: ReturnType<typeof useTheme>["colors"]) {
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: C.bg },
        scroll: { paddingHorizontal: 28, paddingTop: 56 },

        backRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 32 },
        backArrow: { color: C.textSub, fontSize: 20 },
        backLabel: { color: C.textSub, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600" },

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
        registerBtnText: { color: C.textInverse, fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },

        loginLink: { alignItems: "center", paddingVertical: 4 },
        loginLinkText: { color: C.textSub, fontSize: 14 },
    });
}

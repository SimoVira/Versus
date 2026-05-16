import { useState, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, Animated, StatusBar
} from "react-native";
import { useRouter } from "expo-router";
import { AuthService } from "../api/auth-service";
import { useTheme } from "../theme";

export default function Login() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const authService = new AuthService();

    const s = makeStyles(colors);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
            router.replace("/tabs/");
        } catch (err: any) {
            setError(err.message);
            shake();
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={s.root}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={s.brandArea}>
                <Text style={s.brandName}>versus</Text>
                <Text style={s.brandSub}>Confronta. Scegli. Meglio.</Text>
            </View>

            <Animated.View style={[s.form, { transform: [{ translateX: shakeAnim }] }]}>

                <Text style={s.formTitle}>Accedi</Text>

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
                        placeholder="••••••••"
                        placeholderTextColor={colors.textDim}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {error !== "" && (
                    <Text style={s.errorText}>{error}</Text>
                )}

                <TouchableOpacity
                    style={[s.loginBtn, loading && s.loginBtnDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color={colors.textInverse} />
                        : <Text style={s.loginBtnText}>Entra</Text>
                    }
                </TouchableOpacity>

                <View style={s.divider}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerText}>non hai un account?</Text>
                    <View style={s.dividerLine} />
                </View>

                <TouchableOpacity
                    style={s.registerBtn}
                    onPress={() => router.push("/register")}
                    activeOpacity={0.7}
                >
                    <Text style={s.registerBtnText}>Registrati</Text>
                </TouchableOpacity>

            </Animated.View>
        </KeyboardAvoidingView>
    );
}

function makeStyles(C: ReturnType<typeof useTheme>["colors"]) {
    return StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: C.bg,
            justifyContent: "center",
            paddingHorizontal: 28,
        },

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

        errorText: {
            color: C.red,
            fontSize: 13,
            textAlign: "center",
        },

        loginBtn: {
            backgroundColor: C.lime,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            marginTop: 4,
        },
        loginBtnDisabled: { opacity: 0.6 },
        loginBtnText: {
            color: C.textInverse,
            fontWeight: "800",
            fontSize: 16,
            letterSpacing: 0.5,
        },

        divider: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginVertical: 4,
        },
        dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
        dividerText: { color: C.textSub, fontSize: 12 },

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
}

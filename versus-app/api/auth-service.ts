import AsyncStorage from "@react-native-async-storage/async-storage";
import { inviaRichiesta } from "./client";

const TOKEN_KEY = "versus_token"; //NOME CHIAVE per salvare il token JWT su AsyncStorage
const USER_KEY  = "versus_user";

export interface User {
    id:    string;
    email: string;
    name:  string;
}

export interface AuthResponse {
    token: string;
    user:  User;
}

export class AuthService {

    // ── Registrazione ────────────────────────────────────────
    public async register(name: string, email: string, password: string): Promise<AuthResponse> {
        const res = await inviaRichiesta("POST", "/register", { name, email, password });
        if (res?.status == 201) {
            await this.saveSession(res.data.token, res.data.user);
            return res.data;
        }
        throw new Error(res?.data?.err || "Errore durante la registrazione");
    }

    // ── Login ────────────────────────────────────────────────
    public async login(email: string, password: string): Promise<AuthResponse> {
        const res = await inviaRichiesta("POST", "/login", { email, password });
        if (res?.status == 200) {
            await this.saveSession(res.data.token, res.data.user);
            return res.data;
        }
        throw new Error(res?.data?.err || "Credenziali non valide");
    }

    // ── Logout ───────────────────────────────────────────────
    public static async logout(): Promise<void> {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }

    // ── Recupera token (usato in libreria.js) ────────────────
    public static async getToken(): Promise<string | null> {
        return AsyncStorage.getItem(TOKEN_KEY);
    }

    // ── Recupera utente corrente ─────────────────────────────
    public static async getUser(): Promise<User | null> {
        const raw = await AsyncStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    // ── Controlla se loggato ─────────────────────────────────
    public static async isLoggedIn(): Promise<boolean> {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        return token != null;
    }

    // ── Salva sessione ───────────────────────────────────────
    private async saveSession(token: string, user: User): Promise<void> {
        await AsyncStorage.multiSet([
            [TOKEN_KEY, token],
            [USER_KEY, JSON.stringify(user)],
        ]);
    }
}
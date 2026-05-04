// Uso: const { colors, isDark } = useTheme();

import { useColorScheme } from "react-native";

export const dark = {
    bg: "#08080F",
    bgElevated: "#0E0E1A",
    card: "#111118",
    cardHover: "#161622",
    border: "#1C1C2E",
    borderLight: "#252538",

    lime: "#C8F135",
    limeDim: "#8AAF22",
    limeFaint: "#1A2A08",

    red: "#FF3B5C",
    redFaint: "#2A0810",

    textPrimary: "#EEEEF8",
    textSub: "#7070A0",
    textDim: "#3A3A5C",
    textInverse: "#08080F",
};

export const light = {
    bg: "#F4F4F8",
    bgElevated: "#FFFFFF",
    card: "#FFFFFF",
    cardHover: "#F0F0F8",
    border: "#E0E0EC",
    borderLight: "#EBEBF5",

    lime: "#5A9400",      // lime più scuro su sfondo chiaro per leggibilità
    limeDim: "#4A7A00",
    limeFaint: "#EEF8D8",

    red: "#D92B4A",
    redFaint: "#FDEEF1",

    textPrimary: "#0E0E1A",
    textSub: "#6060A0",
    textDim: "#AFAFCF",
    textInverse: "#FFFFFF",
};

export type ThemeColors = typeof dark;

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
    const scheme = useColorScheme(); //legge il tema del sistema operativo
    const isDark = scheme !== "light";
    return { colors: isDark ? dark : light, isDark };//colors assume il valore del colore del sistema operativo, se è scuro prende i colori da dark, altrimenti da light
}
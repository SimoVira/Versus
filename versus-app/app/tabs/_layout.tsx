import { Tabs } from "expo-router";
import { Text } from "react-native";

const C = {
    bg:      "#08080F",
    card:    "#111118",
    border:  "#1C1C2E",
    lime:    "#C8F135",
    textSub: "#7070A0",
};

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
    return (
        <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
            {emoji}
        </Text>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: C.card,
                    borderTopColor: C.border,
                    borderTopWidth: 1,
                    height: 64,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarActiveTintColor:   C.lime,
                tabBarInactiveTintColor: C.textSub,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ focused }) => <TabIcon emoji="⊞" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="favorites"
                options={{
                    title: "Preferiti",
                    tabBarIcon: ({ focused }) => <TabIcon emoji="♥" focused={focused} />,
                }}
            />
        </Tabs>
    );
}
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { AuthService } from "../api/auth-service";
import { useTheme } from "../theme";

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(function () {
    AuthService.isLoggedIn().then(function (logged) {
      router.replace(logged ? "/home" : "/login");
    }).finally(function () {
      setReady(true);
    });
  }, []);

  if (ready) {
    return null;
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.lime} />
    </View>
  );
}
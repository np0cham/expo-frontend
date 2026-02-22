import { fetchAuthSession } from "aws-amplify/auth";
import { useRouter, useSegments } from "expo-router";
import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

type AuthState = {
  ready: boolean;
  authed: boolean;
};

export default function AuthGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const segments = useSegments();
  const [state, setState] = useState<AuthState>({ ready: false, authed: false });

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const session = await fetchAuthSession();
        if (!active) return;
        setState({ ready: true, authed: Boolean(session.tokens?.accessToken) });
      } catch {
        if (!active) return;
        setState({ ready: true, authed: false });
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, [segments.join("/")]);

  useEffect(() => {
    if (!state.ready) return;

    const root = segments[0];
    const inTabs = root === "(tabs)";
    const inAuth = root === "login" || root === "signup" || root === "confirm-signup";

    if (!state.authed && inTabs) {
      router.replace("/login");
      return;
    }

    if (state.authed && inAuth) {
      router.replace("/(tabs)");
    }
  }, [state, segments, router]);

  if (!state.ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
});

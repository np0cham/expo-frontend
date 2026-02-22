import LiquidGlassBottomNav from "@/components/liquid-glass-bottom-nav";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("index");

  // Update active tab based on pathname
  useEffect(() => {
    if (pathname.includes("create-post")) {
      setActiveTab("create-post");
    } else if (pathname.includes("notifications")) {
      setActiveTab("notifications");
    } else if (pathname.includes("profile")) {
      setActiveTab("profile");
    } else if (pathname.includes("explore")) {
      setActiveTab("explore");
    } else {
      setActiveTab("index");
    }
  }, [pathname]);

  const handleTabChange = (route: string) => {
    setActiveTab(route);
    router.navigate(`/(tabs)/${route}` as any);
  };

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="index"
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="create-post" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="setup-profile" />
      </Stack>

      <LiquidGlassBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

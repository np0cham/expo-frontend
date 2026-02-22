import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface NavItem {
  name: string;
  label: string;
  icon: any;
  route: string;
}

interface LiquidGlassBottomNavProps {
  activeTab: string;
  onTabChange: (route: string) => void;
}

const navItems: NavItem[] = [
  { name: "(tabs)", label: "Home", icon: "house.fill", route: "index" },
  { name: "search", label: "Search", icon: "magnifyingglass", route: "explore" },
  {
    name: "create",
    label: "Create",
    icon: "plus",
    route: "create-post",
  },
  { name: "bell", label: "Notifications", icon: "bell.fill", route: "notifications" },
  {
    name: "profile",
    label: "Profile",
    icon: "person.fill",
    route: "profile",
  },
];

export default function LiquidGlassBottomNav({
  activeTab,
  onTabChange,
}: LiquidGlassBottomNavProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const handlePress = (route: string) => {
    onTabChange(route);
  };

  const handleCreatePress = () => {
    onTabChange("create-post");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <BlurView intensity={90} style={styles.blurView}>
        <View style={styles.navBar}>
          {navItems.map((item) => {
            const isActive = activeTab === item.route;
            const isCreateButton = item.name === "create";

            return (
              <TouchableOpacity
                key={item.name}
                style={styles.navItem}
                onPress={() =>
                  isCreateButton ? handleCreatePress() : handlePress(item.route)
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isActive && !isCreateButton && styles.activeIconContainer,
                    isCreateButton && styles.createIconContainer,
                  ]}
                >
                  <IconSymbol
                    size={isCreateButton ? 32 : 28}
                    name={item.icon}
                    color={
                      isCreateButton
                        ? colors.background
                        : isActive
                          ? colors.tint
                          : colors.tabIconDefault
                    }
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  blurView: {
    paddingBottom: Platform.OS === "ios" ? 0 : 16,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  activeIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  createIconContainer: {
    backgroundColor: "rgba(59, 130, 246, 0.8)",
    marginTop: 8,
  },
});

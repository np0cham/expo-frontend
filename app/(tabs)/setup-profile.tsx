import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Alert, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { generateClient } from "aws-amplify/api";

const client = generateClient();

export default function SetupProfileScreen() {
  const params = useLocalSearchParams();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [instruments, setInstruments] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // 既存のプロフィール情報があれば初期値として設定
  useEffect(() => {
    if (params.name) {
      setName(String(params.name));
    }
    if (params.age) {
      setAge(String(params.age));
    }
    if (params.bio) {
      setBio(String(params.bio));
    }
    if (params.instruments) {
      setInstruments(String(params.instruments));
    }
  }, [params]);

  const handleSaveProfile = async () => {
    if (!name.trim() || !age.trim()) {
      Alert.alert("エラー", "ユーザー名と年齢は必須です");
      return;
    }

    if (isNaN(Number(age))) {
      Alert.alert("エラー", "年齢は数値で入力してください");
      return;
    }

    try {
      setIsLoading(true);
      
      const instrumentList = instruments
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      // API呼び出し
      const response = await client.graphql({
        query: `
          mutation CreateDbUserProfile(
            $name: String!
            $age: Int!
            $bio: String
            $instruments: [String]!
          ) {
            createDbUserProfile(
              name: $name
              age: $age
              bio: $bio
              instruments: $instruments
            ) {
              id
              name
              age
              bio
              instruments
            }
          }
        `,
        variables: {
          name: name.trim(),
          age: Number(age),
          bio: bio.trim() || null,
          instruments: instrumentList.length > 0 ? instrumentList : [""],
        },
      });

      Alert.alert("成功", "プロフィールを作成しました", [
        {
          text: "OK",
          onPress: () => {
            // 前のスクリーンに戻す
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("Profile creation error:", error);
      Alert.alert("エラー", "プロフィールの作成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.container}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <IconSymbol
              size={24}
              name="chevron.left"
              color={colors.tint}
            />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
            プロフィール設定
          </ThemedText>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.infoSection}>
          <ThemedText style={styles.infoText}>
            投稿するにはプロフィール情報を設定する必要があります
          </ThemedText>
        </View>

        {/* ユーザー名入力 */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>ユーザー名 *</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.tabIconDefault,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="ユーザー名を入力"
            placeholderTextColor={colors.tabIconDefault}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
          <ThemedText style={styles.charCount}>{name.length}/50</ThemedText>
        </View>

        {/* 年齢入力 */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>年齢 *</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.tabIconDefault,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="年齢を入力"
            placeholderTextColor={colors.tabIconDefault}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        {/* バイオ入力 */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>自己紹介</ThemedText>
          <TextInput
            style={[
              styles.bioInput,
              {
                borderColor: colors.tabIconDefault,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="自己紹介を入力"
            placeholderTextColor={colors.tabIconDefault}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <ThemedText style={styles.charCount}>{bio.length}/500</ThemedText>
        </View>

        {/* 楽器入力 */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>楽器（カンマ区切り）</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.tabIconDefault,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="例: ギター, ベース, ドラム"
            placeholderTextColor={colors.tabIconDefault}
            value={instruments}
            onChangeText={setInstruments}
            maxLength={200}
          />
          <ThemedText style={styles.helperText}>
            複数の楽器をカンマで区切って入力してください
          </ThemedText>
        </View>
      </ScrollView>

      {/* 保存ボタン */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.tint, opacity: isLoading ? 0.6 : 1 },
          ]}
          onPress={handleSaveProfile}
          disabled={isLoading}
        >
          <ThemedText
            style={[styles.saveButtonText, { color: colors.background }]}
          >
            {isLoading ? "保存中..." : "プロフィールを保存"}
          </ThemedText>
        </TouchableOpacity>
      </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  infoSection: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(59, 130, 246, 0.8)",
  },
  infoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    opacity: 0.5,
  },
  helperText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 16,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

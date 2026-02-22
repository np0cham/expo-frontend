import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { generateClient } from "aws-amplify/api";
import { getCurrentUser } from "aws-amplify/auth";
import { getUrl, uploadData } from "aws-amplify/storage";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface MediaItem {
  uri: string;
  type: "image" | "video";
}

export default function CreatePostScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // Check if user has a profile when screen is focused
  useFocusEffect(
    useCallback(() => {
      checkUserProfile();
    }, [])
  );

  const checkUserProfile = async () => {
    try {
      const user = await getCurrentUser();
      const client = generateClient();

      const response = await client.graphql({
        query: `
          query ListDbUserProfiles {
            listDbUserProfiles {
              id
              name
            }
          }
        `,
      });

      const userProfiles = ((response as any)?.data?.listDbUserProfiles || []) as any[];
      
      // Check if current user has a profile
      const hasProfile = userProfiles.some(
        (profile: any) => profile.id === user.userId
      );

      if (!hasProfile) {
        // Show alert and navigate to setup profile
        Alert.alert(
          "プロフィール設定が必要です",
          "質問を投稿するにはプロフィール情報を設定してください",
          [
            {
              text: "キャンセル",
              onPress: () => router.back(),
            },
            {
              text: "プロフィールを設定",
              onPress: () => {
                router.navigate("setup-profile" as never);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error checking profile:", error);
      // If there's an error checking profile, still allow user to proceed
      // They'll get an error when trying to post
    }
  };

  const handlePickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.7,
        videoMaxDuration: 60,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const mediaType = asset.type === "video" ? "video" : "image";
        setSelectedMedia([...selectedMedia, { uri: asset.uri, type: mediaType }]);
      }
    } catch (error) {
      console.error("[CreatePost] Error picking media:", error);
      Alert.alert("エラー", "メディア選択に失敗しました");
    }
  };

  const handleRemoveMedia = (index: number) => {
    setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
  };

  const uploadMediaToS3 = async (): Promise<string[]> => {
    if (selectedMedia.length === 0) return [];

    try {
      setUploadingMedia(true);
      const uploadedUrls: string[] = [];

      for (const media of selectedMedia) {
        try {
          // ファイル拡張子を判定
          const extension = media.type === "video" ? "mp4" : "jpg";
          const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
          console.log("[CreatePost] Uploading to S3:", fileName, "Type:", media.type);

          // ファイルをアップロード
          const result = await uploadData({
            path: `public/${fileName}`,
            data: await fetch(media.uri).then((res) => res.blob()),
          }).result;

          console.log("[CreatePost] Upload result:", result);

          // URLを取得
          const urlResult = await getUrl({
            path: `public/${fileName}`,
          });

          uploadedUrls.push(urlResult.url.toString());
        } catch (error) {
          console.error("[CreatePost] Error uploading single media:", error);
        }
      }

      return uploadedUrls;
    } catch (error) {
      console.error("[CreatePost] Error uploading media:", error);
      throw error;
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePost = async () => {
    console.log("[CreatePost] handlePost called");
    console.log("[CreatePost] Title:", title);
    console.log("[CreatePost] Content:", content);

    if (!title.trim() || !content.trim()) {
      console.warn("[CreatePost] Validation failed - empty title or content");
      Alert.alert("エラー", "タイトルと本文を入力してください");
      return;
    }

    try {
      setIsLoading(true);
      console.log("[CreatePost] Getting current user...");
      const user = await getCurrentUser();
      console.log("[CreatePost] Current user:", user.userId);

      const client = generateClient();
      console.log("[CreatePost] GraphQL client initialized");

      // Check if user has a profile
      console.log("[CreatePost] Checking user profile...");
      const profileResponse = await client.graphql({
        query: `
          query ListDbUserProfiles {
            listDbUserProfiles {
              id
            }
          }
        `,
      });

      const userProfiles = ((profileResponse as any)?.data?.listDbUserProfiles || []) as any[];
      console.log("[CreatePost] User profiles found:", userProfiles.length);

      const hasProfile = userProfiles.some(
        (profile: any) => profile.id === user.userId
      );

      if (!hasProfile) {
        console.warn("[CreatePost] User does not have a profile");
        Alert.alert("エラー", "プロフィール情報を設定してください");
        return;
      }

      // Upload media to S3 first
      console.log("[CreatePost] Uploading media to S3...");
      const attachments = await uploadMediaToS3();
      console.log("[CreatePost] Media uploaded, URLs:", attachments);

      // Create question
      console.log("[CreatePost] Creating question with data:", {
        title,
        content,
        userId: user.userId,
        showUsername: true,
        category: "OTHER",
        attachments,
      });

      const mutation = `
        mutation CreateDbQuestion(
          $title: String!
          $content: String!
          $attachments: [String!]!
          $showUsername: Boolean!
          $category: String!
        ) {
          createDbQuestion(
            title: $title
            content: $content
            attachments: $attachments
            showUsername: $showUsername
            category: $category
          ) {
            id
            title
          }
        }
      `;

      console.log("[CreatePost] Sending mutation...");
      const response = await client.graphql({
        query: mutation,
        variables: {
          title: title.trim(),
          content: content.trim(),
          attachments,
          showUsername: true,
          category: "OTHER",
        },
      });

      console.log("[CreatePost] Mutation response:", response);

      if ((response as any)?.data?.createDbQuestion) {
        console.log("[CreatePost] Question created successfully:", (response as any).data.createDbQuestion);
        Alert.alert("成功", "質問を投稿しました", [
          {
            text: "OK",
            onPress: () => {
              setTitle("");
              setContent("");
              setSelectedMedia([]);
              router.push("/(tabs)");
            },
          },
        ]);
      } else {
        console.error("[CreatePost] No data in response:", response);
        Alert.alert("エラー", "質問の投稿に失敗しました（レスポンスなし）");
      }
    } catch (error) {
      console.error("[CreatePost] Exception caught:", error);
      if (error instanceof Error) {
        console.error("[CreatePost] Error message:", error.message);
        console.error("[CreatePost] Error stack:", error.stack);
      }
      Alert.alert("エラー", `質問の投稿に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      console.log("[CreatePost] Loading state set to false");
    }
  };

  return (
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
          <ThemedText
            style={[styles.headerTitle, { color: colors.text }]}
          >
            質問を投稿
          </ThemedText>
          <View style={styles.backButtonPlaceholder} />
        </View>

        {/* メディアアップロード */}
        <View style={styles.imageUploadSection}>
          <TouchableOpacity
            style={[
              styles.imageUploadBox,
              { borderColor: colors.tabIconDefault },
            ]}
            onPress={handlePickMedia}
            disabled={uploadingMedia}
          >
            <IconSymbol
              size={48}
              name="photo.badge.plus"
              color={colors.tabIconDefault}
            />
            <ThemedText style={styles.imageUploadText}>
              画像・動画を選択
            </ThemedText>
          </TouchableOpacity>

          {/* 選択されたメディアのプレビュー */}
          {selectedMedia.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedMedia.map((media, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    {media.type === "image" ? (
                      <Image source={{ uri: media.uri }} style={styles.previewImage} />
                    ) : (
                      <View style={[styles.previewImage, styles.videoPlaceholder]}>
                        <IconSymbol size={48} name="play.circle.fill" color="white" />
                        <ThemedText style={styles.videoPlaceholderText}>動画</ThemedText>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveMedia(index)}
                    >
                      <IconSymbol size={20} name="xmark.circle.fill" color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              {uploadingMedia && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color={colors.tint} />
                  <ThemedText style={styles.uploadingText}>アップロード中...</ThemedText>
                </View>
              )}
            </View>
          )}
        </View>

        {/* タイトル入力 */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>タイトル</ThemedText>
          <TextInput
            style={[
              styles.titleInput,
              {
                borderColor: colors.tabIconDefault,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="タイトルを入力"
            placeholderTextColor={colors.tabIconDefault}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <ThemedText style={styles.charCount}>
            {title.length}/100
          </ThemedText>
        </View>

        {/* 本文入力 */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>質問内容</ThemedText>
          <TextInput
            style={[
              styles.contentInput,
              {
                borderColor: colors.tabIconDefault,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="本文を入力"
            placeholderTextColor={colors.tabIconDefault}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <ThemedText style={styles.charCount}>
            {content.length}/2000
          </ThemedText>
        </View>
      </ScrollView>

      {/* 投稿ボタン */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.postButton,
            { backgroundColor: colors.tint, opacity: isLoading ? 0.6 : 1 },
          ]}
          onPress={handlePost}
          disabled={isLoading}
        >
          <ThemedText
            style={[styles.postButtonText, { color: colors.background }]}
          >
            {isLoading ? "投稿中..." : "質問を投稿"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
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
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
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
  imageUploadSection: {
    marginBottom: 32,
  },
  imageUploadBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    minHeight: 160,
  },
  imageUploadText: {
    marginTop: 12,
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
  titleInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 200,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  postButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  imagePreviewContainer: {
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  imagePreviewItem: {
    marginRight: 12,
    position: "relative",
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 12,
    color: "white",
  },
  videoPlaceholder: {
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "white",
    fontWeight: "600",
  },
});

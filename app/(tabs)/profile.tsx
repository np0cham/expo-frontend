import { StyleSheet, View, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { signOut, getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/api";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import React, { useState, useCallback } from "react";

interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  instruments?: string[];
}

interface Question {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  attachments: string[];
  showUsername: boolean;
  category: string;
  commentCount?: number;
  userName?: string;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userQuestions, setUserQuestions] = useState<Question[]>([]);

  // Load profile when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      const client = generateClient();

      // ユーザープロフィール取得
      const response = await client.graphql({
        query: `
          query ListDbUserProfiles {
            listDbUserProfiles {
              id
              name
              age
              bio
              instruments
            }
          }
        `,
      });

      const userProfiles = ((response as any)?.data?.listDbUserProfiles || []) as any[];
      const currentProfile = userProfiles.find(
        (profile: any) => profile.id === user.userId
      );

      if (currentProfile) {
        setUserProfile(currentProfile);
      }

      // ユーザーの投稿取得
      const questionsResponse = await client.graphql({
        query: `
          query ListDbQuestions {
            listDbQuestions {
              id
              title
              content
              userId
              createdAt
              updatedAt
              attachments
              showUsername
              category
            }
          }
        `,
      });

      const allQuestions = ((questionsResponse as any)?.data?.listDbQuestions || []) as any[];
      const userQuestionsData = allQuestions.filter(
        (q: any) => q.userId === user.userId
      );

      // コメント取得
      const commentsResponse = await client.graphql({
        query: `
          query ListDbComments {
            listDbComments {
              id
              questionId
              userId
            }
          }
        `,
      });

      const allComments = ((commentsResponse as any)?.data?.listDbComments || []) as any[];

      // 各質問にコメント数と投稿者名を追加
      const questionsWithMetadata = userQuestionsData.map((q: any) => {
        // 投稿者のプロフィール情報を検索
        const questionAuthor = userProfiles.find((p: any) => p.id === q.userId);
        return {
          ...q,
          commentCount: allComments.filter((c: any) => c.questionId === q.id && !c.parentCommentId).length,
          userName: q.showUsername && questionAuthor ? questionAuthor.name : "匿名",
        };
      });
      setUserQuestions(questionsWithMetadata);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    if (userProfile) {
      router.navigate({
        pathname: "setup-profile",
        params: {
          name: userProfile.name,
          age: String(userProfile.age),
          bio: userProfile.bio || "",
          instruments: (userProfile.instruments || []).join(", "),
        },
      } as never);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    Alert.alert(
      "投稿を削除",
      "本当にこの投稿を削除しますか？",
      [
        {
          text: "キャンセル",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "削除",
          onPress: async () => {
            try {
              const client = generateClient();
              await client.graphql({
                query: `
                  mutation DeleteDbQuestion($id: ID!) {
                    deleteDbQuestion(id: $id)
                  }
                `,
                variables: {
                  id: questionId,
                },
              });

              // 投稿リストから削除する
              setUserQuestions((prev) => prev.filter((q) => q.id !== questionId));
              Alert.alert("成功", "投稿を削除しました");
            } catch (error) {
              console.error("Delete question error:", error);
              Alert.alert("エラー", "投稿の削除に失敗しました");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // 日時フォーマット関数
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diff / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diff / (1000 * 60));
        return `${Math.max(1, diffMins)}分前`;
      }
      return `${diffHours}時間前`;
    } else if (diffDays === 1) {
      return "1日前";
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    }
    return d.toLocaleDateString("ja-JP");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>プロフィール</ThemedText>
        </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : userProfile ? (
        <ScrollView>
          <View style={styles.profileSection}>
            <View
              style={[styles.avatar, { backgroundColor: colors.tint }]}
            >
              <IconSymbol
                size={48}
                name="person.fill"
                color={colors.background}
              />
            </View>
            <View style={styles.profileInfo}>
              <ThemedText style={styles.username}>{userProfile.name}</ThemedText>
              <ThemedText style={styles.bio}>{userProfile.age}歳</ThemedText>
            </View>
          </View>

          {userProfile.bio && (
            <View style={styles.bioSection}>
              <ThemedText style={styles.sectionTitle}>自己紹介</ThemedText>
              <ThemedText style={styles.bioText}>{userProfile.bio}</ThemedText>
            </View>
          )}

          {userProfile.instruments && userProfile.instruments.length > 0 && (
            <View style={styles.bioSection}>
              <ThemedText style={styles.sectionTitle}>楽器</ThemedText>
              <View style={styles.instrumentsList}>
                {userProfile.instruments.map((instrument, index) => (
                  <View key={index} style={styles.instrumentTag}>
                    <ThemedText style={styles.instrumentText}>{instrument}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>0</ThemedText>
              <ThemedText style={styles.statLabel}>フォロワー</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>0</ThemedText>
              <ThemedText style={styles.statLabel}>フォロー中</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{userQuestions.length}</ThemedText>
              <ThemedText style={styles.statLabel}>投稿</ThemedText>
            </View>
          </View>

          <View style={styles.menuSection}>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.tabIconDefault }]}
              onPress={handleEditProfile}
            >
              <IconSymbol size={24} name="pencil" color={colors.text} />
              <ThemedText style={styles.menuText}>プロフィールを編集</ThemedText>
              <IconSymbol size={20} name="chevron.right" color={colors.tabIconDefault} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.tabIconDefault }]}
            >
              <IconSymbol size={24} name="gear" color={colors.text} />
              <ThemedText style={styles.menuText}>設定</ThemedText>
              <IconSymbol size={20} name="chevron.right" color={colors.tabIconDefault} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleSignOut}
            >
              <IconSymbol size={24} name="rectangle.portrait.and.arrow.right" color="#FF3B30" />
              <ThemedText style={[styles.menuText, { color: "#FF3B30" }]}>
                サインアウト
              </ThemedText>
              <IconSymbol size={20} name="chevron.right" color={colors.tabIconDefault} />
            </TouchableOpacity>
          </View>

          {/* 自分の投稿セクション */}
          <View style={styles.postsSection}>
            <ThemedText style={styles.postsSectionTitle}>自分の投稿</ThemedText>
            {userQuestions.length === 0 ? (
              <ThemedText style={styles.noPostsText}>投稿がまだありません</ThemedText>
            ) : (
              <View>
                {userQuestions.map((question) => (
                  <View key={question.id} style={styles.postCard}>
                    <View style={styles.postHeader}>
                      <View style={styles.postTitleContainer}>
                        <ThemedText style={styles.postTitle} numberOfLines={2}>
                          {question.title}
                        </ThemedText>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteQuestion(question.id)}
                        style={styles.deleteButton}
                      >
                        <IconSymbol size={20} name="xmark" color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                    <ThemedText style={styles.postCategory}>{question.category}</ThemedText>
                    <View style={styles.postMetadata}>
                      <ThemedText style={styles.postUserName}>{question.userName}</ThemedText>
                      <ThemedText style={styles.postCommentCount}>コメント: {question.commentCount || 0}</ThemedText>
                    </View>
                    <ThemedText style={styles.postTime}>{formatDate(question.createdAt)}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>プロフィール情報がありません</ThemedText>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: colors.tint }]}
            onPress={handleEditProfile}
          >
            <ThemedText style={[styles.setupButtonText, { color: colors.background }]}>
              プロフィールを設定
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    opacity: 0.6,
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  menuSection: {
    paddingTop: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.6,
  },
  setupButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    opacity: 0.7,
  },
  instrumentsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  instrumentTag: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  instrumentText: {
    fontSize: 13,
    fontWeight: "500",
  },
  postsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  postsSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  noPostsText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    paddingVertical: 16,
  },
  postCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  postTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  deleteButton: {
    padding: 4,
  },
  postCategory: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 6,
  },
  postMetadata: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  postUserName: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: "500",
  },
  postCommentCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  postTime: {
    fontSize: 12,
    opacity: 0.5,
  },});
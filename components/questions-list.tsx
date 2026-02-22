import { generateClient } from "aws-amplify/data";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useRouter } from "expo-router";

import type { Schema } from "@/amplify/data/resource";
import { AuthTokens } from "@/constants/design-tokens";

const CATEGORIES = ["ギター", "ベース", "ドラム", "その他"];

type Question = Schema["DbQuestion"]["type"];

interface QuestionWithCounts extends Question {
  likeCount: number;
  commentCount: number;
}

export default function QuestionsListScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionWithCounts[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client] = useState(() => generateClient<Schema>());

  // フィルター済みの質問
  const filteredQuestions = useMemo(() => {
    if (!selectedCategory) return questions;
    return questions.filter((q) => q.category === selectedCategory);
  }, [questions, selectedCategory]);

  // 質問を取得
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[QuestionsListScreen] Fetching questions...");
      const response = await client.queries.listDbQuestions({
        authMode: "userPool",
      });

      console.log("[QuestionsListScreen] Response errors:", response.errors);
      console.log("[QuestionsListScreen] Response data count:", response.data?.length);

      if (response.errors?.length) {
        console.log("Error fetching questions:", response.errors);
        setError(response.errors.map((item) => item.message).join(", "));
        setQuestions([]);
        return;
      }

      const safeQuestions = (response.data ?? []).filter(
        (item): item is Question => Boolean(item),
      );

      console.log("[QuestionsListScreen] Safe questions count:", safeQuestions.length);

      // コメント数を取得するために、すべてのコメントを取得
      console.log("[QuestionsListScreen] Fetching comments...");
      const commentsResponse = await client.queries.listDbComments({
        authMode: "userPool",
      });
      const allComments = (commentsResponse.data ?? []).filter(
        (item): item is Schema["DbComment"]["type"] => Boolean(item),
      );

      console.log("[QuestionsListScreen] Total comments count:", allComments.length);

      // 質問ごとのコメント数を計算
      const questionsWithCounts: QuestionWithCounts[] = safeQuestions.map(
        (q) => ({
          ...q,
          likeCount: 0, // TODO: バックエンドでいいね機能を実装したら更新
          commentCount: allComments.filter((c) => c.questionId === q.id).length,
        }),
      );

      console.log("[QuestionsListScreen] Questions with counts:", questionsWithCounts.length);
      setQuestions(questionsWithCounts);
    } catch (err) {
      console.error("[QuestionsListScreen] Error fetching questions:", err);
      if (err instanceof Error) {
        console.error("[QuestionsListScreen] Error message:", err.message);
        console.error("[QuestionsListScreen] Error stack:", err.stack);
      }
      setError("質問の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

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

  if (loading && questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AuthTokens.colors.textPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* カテゴリフィルター */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.categoryButton,
              selectedCategory === cat && styles.categoryButtonActive,
            ]}
            onPress={() =>
              setSelectedCategory(selectedCategory === cat ? null : cat)
            }
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat && styles.categoryTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 質問リスト */}
      <View style={styles.questionsContainer}>
        {filteredQuestions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>質問がありません</Text>
          </View>
        ) : (
          filteredQuestions.map((question) => (
            <Pressable
              key={question.id}
              onPress={() =>
                router.navigate({
                  pathname: "/(tabs)/question-detail",
                  params: { id: question.id },
                } as any)
              }
            >
              <View style={styles.questionCard}>
                <Text style={styles.questionTitle} numberOfLines={2}>
                  {question.title}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>♥</Text>
                    <Text style={styles.statText}>{question.likeCount}</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>💬</Text>
                    <Text style={styles.statText}>
                      {question.commentCount}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.userName}>
                    {question.showUsername ? "ユーザー" : "匿名"}
                  </Text>
                  <Text style={styles.timestamp}>
                    {formatDate(question.createdAt)}
                  </Text>
                </View>

                <View style={styles.divider} />
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthTokens.colors.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    color: AuthTokens.colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e0e0e0",
  },
  categoryButtonActive: {
    backgroundColor: "#ff6b6b",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500",
    color: AuthTokens.colors.textPrimary,
  },
  categoryTextActive: {
    color: "#ffffff",
  },
  questionsContainer: {
    gap: 0,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: AuthTokens.colors.textMuted,
    fontSize: 14,
  },
  questionCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AuthTokens.colors.textPrimary,
    marginBottom: 12,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    fontSize: 16,
  },
  statText: {
    fontSize: 12,
    color: AuthTokens.colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 12,
    color: AuthTokens.colors.textMuted,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 12,
    color: AuthTokens.colors.textMuted,
  },
  divider: {
    height: 0,
    borderBottomWidth: 0,
  },
});

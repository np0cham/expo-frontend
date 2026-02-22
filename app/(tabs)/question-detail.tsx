import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { generateClient } from "aws-amplify/api";
import { getCurrentUser } from "aws-amplify/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Video, ResizeMode } from "expo-av";

interface Question {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  category: string;
  showUsername: boolean;
  attachments?: string[];
}

interface Comment {
  id: string;
  questionId: string;
  userId: string;
  content: string;
  createdAt: string;
  showUsername: boolean;
  parentCommentId?: string | null;
  attachments?: string[];
}

export default function QuestionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [question, setQuestion] = useState<Question | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadQuestionAndComments();
    }
  }, [id]);

  const loadQuestionAndComments = async () => {
    try {
      setIsLoading(true);
      const client = generateClient();

      // Fetch all questions
      const questionsResponse = await client.graphql({
        query: `
          query ListDbQuestions {
            listDbQuestions {
              id
              title
              content
              userId
              createdAt
              category
              showUsername
              attachments
            }
          }
        `,
      });

      const allQuestions = ((questionsResponse as any)?.data?.listDbQuestions || []) as Question[];
      const currentQuestion = allQuestions.find((q) => q.id === id);

      if (currentQuestion) {
        setQuestion(currentQuestion);
      }

      // Fetch all comments
      const commentsResponse = await client.graphql({
        query: `
          query ListDbComments {
            listDbComments {
              id
              questionId
              userId
              content
              createdAt
              showUsername
              parentCommentId
              attachments
            }
          }
        `,
      });

      const allComments = ((commentsResponse as any)?.data?.listDbComments || []) as Comment[];
      const questionComments = allComments.filter((c) => c.questionId === id);
      setComments(questionComments);
    } catch (error) {
      console.error("Error loading question:", error);
      Alert.alert("エラー", "質問の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) {
      Alert.alert("エラー", "コメントを入力してください");
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await getCurrentUser();
      const client = generateClient();

      const mutation = `
        mutation CreateDbComment(
          $questionId: ID!
          $content: String!
          $attachments: [String!]!
          $showUsername: Boolean!
          $parentCommentId: ID
        ) {
          createDbComment(
            questionId: $questionId
            content: $content
            attachments: $attachments
            showUsername: $showUsername
            parentCommentId: $parentCommentId
          ) {
            id
            questionId
            userId
            content
            createdAt
            showUsername
            parentCommentId
          }
        }
      `;

      const response = await client.graphql({
        query: mutation,
        variables: {
          questionId: id,
          content: commentText.trim(),
          attachments: [],
          showUsername: true,
          parentCommentId: replyingTo || undefined,
        },
      });

      if ((response as any)?.data?.createDbComment) {
        setCommentText("");
        setReplyingTo(null);
        loadQuestionAndComments();
        Alert.alert("成功", "コメントを投稿しました");
      } else {
        Alert.alert("エラー", "コメントの投稿に失敗しました");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      Alert.alert("エラー", "コメントの投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

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

  // Group comments by parent
  const groupedComments = comments.reduce((acc, comment) => {
    if (!comment.parentCommentId) {
      acc.push({
        comment,
        replies: comments.filter((c) => c.parentCommentId === comment.id),
      });
    }
    return acc;
  }, [] as Array<{ comment: Comment; replies: Comment[] }>);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </ThemedView>
    );
  }

  if (!question) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>質問が見つかりません</ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.backButtonText, { color: colors.background }]}>
              戻る
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backIconButton}
          >
            <IconSymbol size={24} name="chevron.left" color={colors.tint} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>質問詳細</ThemedText>
          <View style={styles.backIconPlaceholder} />
        </View>

        {/* 質問 */}
        <View style={styles.questionSection}>
          <ThemedText style={styles.questionTitle}>{question.title}</ThemedText>
          <ThemedText style={styles.questionCategory}>{question.category}</ThemedText>
          <ThemedText style={styles.questionContent}>{question.content}</ThemedText>
          {question.attachments && question.attachments.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentPreviewContainer}>
              {question.attachments.map((mediaUrl, index) => (
                <View key={index} style={styles.attachmentPreview}>
                  {isVideoUrl(mediaUrl) ? (
                    <Video
                      source={{ uri: mediaUrl }}
                      style={styles.attachmentVideo}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={false}
                    />
                  ) : (
                    <Image source={{ uri: mediaUrl }} style={styles.attachmentImage} />
                  )}
                </View>
              ))}
            </ScrollView>
          )}
          <ThemedText style={styles.questionMeta}>
            {question.showUsername ? "ユーザー" : "匿名"} • {formatDate(question.createdAt)}
          </ThemedText>
        </View>

        <View style={styles.divider} />

        {/* コメント一覧 */}
        <View style={styles.commentsSection}>
          <ThemedText style={styles.commentsSectionTitle}>
            コメント（{comments.length}件）
          </ThemedText>

          {groupedComments.length === 0 ? (
            <ThemedText style={styles.noCommentsText}>コメントはまだありません</ThemedText>
          ) : (
            <View>
              {groupedComments.map(({ comment, replies }) => (
                <View key={comment.id}>
                  {/* 親コメント */}
                  <View style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <ThemedText style={styles.commentAuthor}>
                        {comment.showUsername ? "ユーザー" : "匿名"}
                      </ThemedText>
                      <ThemedText style={styles.commentTime}>
                        {formatDate(comment.createdAt)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.commentContent}>{comment.content}</ThemedText>
                    {comment.attachments && comment.attachments.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commentAttachmentPreviewContainer}>
                        {comment.attachments.map((mediaUrl, index) => (
                          <View key={index} style={styles.commentAttachmentPreview}>
                            {isVideoUrl(mediaUrl) ? (
                              <Video
                                source={{ uri: mediaUrl }}
                                style={styles.commentAttachmentVideo}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay={false}
                              />
                            ) : (
                              <Image source={{ uri: mediaUrl }} style={styles.commentAttachmentImage} />
                            )}
                          </View>
                        ))}
                      </ScrollView>
                    )}
                    <TouchableOpacity
                      onPress={() => setReplyingTo(comment.id)}
                      style={styles.replyButton}
                    >
                      <IconSymbol size={16} name="arrowshape.turn.up.left" color={colors.tint} />
                      <ThemedText style={[styles.replyButtonText, { color: colors.tint }]}>
                        返信
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* 返信コメント */}
                  {replies.map((reply) => (
                    <View key={reply.id} style={styles.replyCommentCard}>
                      <View style={styles.replyIndent} />
                      <View style={styles.replyContent}>
                        <View style={styles.commentHeader}>
                          <ThemedText style={styles.commentAuthor}>
                            {reply.showUsername ? "ユーザー" : "匿名"}
                          </ThemedText>
                          <ThemedText style={styles.commentTime}>
                            {formatDate(reply.createdAt)}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.commentContent}>{reply.content}</ThemedText>
                        {reply.attachments && reply.attachments.length > 0 && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commentAttachmentPreviewContainer}>
                            {reply.attachments.map((mediaUrl, index) => (
                              <View key={index} style={styles.commentAttachmentPreview}>
                                {isVideoUrl(mediaUrl) ? (
                                  <Video
                                    source={{ uri: mediaUrl }}
                                    style={styles.commentAttachmentVideo}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay={false}
                                  />
                                ) : (
                                  <Image source={{ uri: mediaUrl }} style={styles.commentAttachmentImage} />
                                )}
                              </View>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* コメント投稿フォーム */}
      <View style={styles.footer}>
        {replyingTo && (
          <View style={[styles.replyingToIndicator, { backgroundColor: colors.tabIconDefault + "20" }]}>
            <ThemedText style={styles.replyingToText}>
              コメントに返信中
            </ThemedText>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <IconSymbol size={20} name="xmark" color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={[
              styles.commentInput,
              {
                borderColor: colors.tabIconDefault,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="コメントを入力..."
            placeholderTextColor={colors.tabIconDefault}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.tint, opacity: isSubmitting ? 0.6 : 1 },
            ]}
            onPress={handlePostComment}
            disabled={isSubmitting}
          >
            <IconSymbol size={20} name="paperplane.fill" color={colors.background} />
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.charCount}>
          {commentText.length}/500
        </ThemedText>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
    opacity: 0.6,
  },
  backButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  backIconButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backIconPlaceholder: {
    width: 40,
  },
  questionSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  questionCategory: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 12,
  },
  questionContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  questionMeta: {
    fontSize: 12,
    opacity: 0.5,
  },
  attachmentPreviewContainer: {
    marginVertical: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  attachmentPreview: {
    marginRight: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  attachmentImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  attachmentVideo: {
    width: 240,
    height: 180,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  commentAttachmentPreviewContainer: {
    marginVertical: 8,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  commentAttachmentPreview: {
    marginRight: 6,
    borderRadius: 6,
    overflow: "hidden",
  },
  commentAttachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  commentAttachmentVideo: {
    width: 160,
    height: 120,
    borderRadius: 6,
    backgroundColor: "#000",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  noCommentsText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    paddingVertical: 16,
  },
  commentCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(59, 130, 246, 0.5)",
  },
  replyCommentCard: {
    flexDirection: "row",
    marginBottom: 8,
    marginLeft: 16,
  },
  replyIndent: {
    width: 3,
    backgroundColor: "rgba(59, 130, 246, 0.3)",
    marginRight: 12,
  },
  replyContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    borderRadius: 6,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 11,
    opacity: 0.5,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.8,
    marginTop: 4,
  },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  replyButtonText: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  replyingToIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    fontWeight: "500",
  },
  commentInputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
  },
  submitButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    opacity: 0.5,
    marginTop: 4,
  },
});

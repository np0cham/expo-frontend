import { confirmSignUp, resendSignUpCode, signIn } from "aws-amplify/auth";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AuthTokens } from "../constants/design-tokens";

export default function ConfirmSignUpScreen() {
  const { email, password } = useLocalSearchParams<{ email?: string; password?: string }>();
  const username = (email ?? "").toString();
  const userPassword = (password ?? "").toString();

  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleConfirm = async () => {
    try {
      setError("");
      setMessage("");
      setIsLoading(true);

      await confirmSignUp({
        username,
        confirmationCode,
      });

      // 確認後、自動的にログイン
      if (userPassword) {
        await signIn({
          username,
          password: userPassword,
        });
        // ログイン完了を待機
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "確認コードの検証に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setError("");
      setMessage("");
      setIsResending(true);

      await resendSignUpCode({ username });
      setMessage("確認コードを再送信しました");
    } catch (e: any) {
      setError(e.message ?? "確認コードの再送信に失敗しました");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>認証コード確認</Text>
        <Text style={styles.label}>メール: {username || "未指定"}</Text>
        <TextInput
          style={styles.input}
          placeholder="確認コード"
          placeholderTextColor={AuthTokens.colors.placeholder}
          value={confirmationCode}
          onChangeText={setConfirmationCode}
          keyboardType="number-pad"
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitText}>認証する</Text>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.secondaryButton,
            isResending && styles.submitButtonDisabled,
          ]}
          onPress={handleResend}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <Text style={styles.secondaryText}>コードを再送信</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.ghostButton}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.ghostText}>ログインに戻る</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AuthTokens.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: AuthTokens.colors.card,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: AuthTokens.colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: AuthTokens.colors.textPrimary,
    marginBottom: 10,
  },
  label: {
    textAlign: "center",
    color: AuthTokens.colors.textMuted,
    marginBottom: 12,
  },
  input: {
    backgroundColor: AuthTokens.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  message: { color: AuthTokens.colors.success, marginBottom: 10 },
  error: { color: AuthTokens.colors.error, marginBottom: 10 },
  submitButton: {
    backgroundColor: AuthTokens.colors.buttonPrimary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: AuthTokens.colors.buttonTextPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: AuthTokens.colors.buttonSecondary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryText: {
    color: AuthTokens.colors.buttonTextSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  ghostButton: {
    alignItems: "center",
    marginTop: 12,
  },
  ghostText: {
    color: AuthTokens.colors.textMuted,
    fontSize: 12,
  },
});

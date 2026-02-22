import { signIn, signUp } from "aws-amplify/auth";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { AuthTokens } from "../constants/design-tokens";

type Mode = "login" | "signup";

type AuthScreenProps = {
  initialMode?: Mode;
};

export default function AuthScreen({ initialMode = "login" }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isSignUp = mode === "signup";
  const title = useMemo(() => (isSignUp ? "新規登録" : "ログイン"), [isSignUp]);

  const resetFeedback = () => {
    setError("");
    setMessage("");
  };

  const handleSubmit = async () => {
    resetFeedback();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!email || !password || !confirmPassword) {
          setError("未入力の項目があります");
          return;
        }

        if (password !== confirmPassword) {
          setError("パスワードが一致しません");
          return;
        }

        const response = await signUp({
          username: email,
          password,
          options: {
            userAttributes: {
              email,
            },
          },
        });

        if (response.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          router.push({
            pathname: "/confirm-signup",
            params: { email, password },
          });
          return;
        }

        setMessage("登録が完了しました。ログインしてください");
        setMode("login");
      } else {
        if (!email || !password) {
          setError("メールアドレスとパスワードを入力してください");
          return;
        }

        const { isSignedIn } = await signIn({
          username: email,
          password,
        });

        if (isSignedIn) {
          router.replace("/(tabs)");
        }
      }
    } catch (e: any) {
      const fallback = isSignUp
        ? "サインアップに失敗しました"
        : "ログインに失敗しました";
      setError(e.message ?? fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitch = (nextMode: Mode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetFeedback();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Pressable
            style={[
              styles.switchButton,
              mode === "login" && styles.switchButtonActive,
            ]}
            onPress={() => handleSwitch("login")}
          >
            <Text
              style={[
                styles.switchText,
                mode === "login" && styles.switchTextActive,
              ]}
            >
              ログイン
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.switchButton,
              mode === "signup" && styles.switchButtonActive,
            ]}
            onPress={() => handleSwitch("signup")}
          >
            <Text
              style={[
                styles.switchText,
                mode === "signup" && styles.switchTextActive,
              ]}
            >
              新規登録
            </Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{title}</Text>

        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor={AuthTokens.colors.placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          placeholderTextColor={AuthTokens.colors.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {isSignUp ? (
          <TextInput
            style={styles.input}
            placeholder="パスワード (確認)"
            placeholderTextColor={AuthTokens.colors.placeholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitText}>{title}</Text>
          )}
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
  switchRow: {
    flexDirection: "row",
    backgroundColor: AuthTokens.colors.switchTrack,
    borderRadius: 999,
    padding: 4,
    marginBottom: 18,
    gap: 6,
  },
  switchButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  switchButtonActive: {
    backgroundColor: AuthTokens.colors.surface,
  },
  switchText: {
    fontSize: 13,
    fontWeight: "600",
    color: AuthTokens.colors.textSubtle,
  },
  switchTextActive: {
    color: AuthTokens.colors.textPrimary,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: AuthTokens.colors.textPrimary,
    marginBottom: 16,
  },
  input: {
    backgroundColor: AuthTokens.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  message: {
    color: AuthTokens.colors.success,
    marginBottom: 10,
  },
  error: {
    color: AuthTokens.colors.error,
    marginBottom: 10,
  },
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
});

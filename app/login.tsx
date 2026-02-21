import { signIn, signUp } from "aws-amplify/auth";
import { router } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      setError("");
      setMessage("");
      const { isSignedIn } = await signIn({
        username: email,
        password,
      });

      if (isSignedIn) {
        router.replace("/(tabs)"); // ログイン後の画面へ
      }
    } catch (e: any) {
      setError(e.message ?? "ログインに失敗しました");
    }
  };

  const handleSignUp = async () => {
    try {
      setError("");
      setMessage("");

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
          params: { email },
        });
        return;
      }

      setMessage("登録が完了しました。ログインしてください");
    } catch (e: any) {
      setError(e.message ?? "サインアップに失敗しました");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttonRow}>
        <View style={styles.buttonWrap}>
          <Button title="ログイン" onPress={handleLogin} />
        </View>
        <View style={styles.buttonWrap}>
          <Button title="サインアップ" onPress={handleSignUp} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  message: { color: "green", marginBottom: 12 },
  error: { color: "red", marginBottom: 12 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  buttonWrap: {
    flex: 1,
  },
});

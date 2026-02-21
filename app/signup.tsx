import { signUp } from "aws-amplify/auth";
import { router } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
      <Text style={styles.title}>サインアップ</Text>
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

      <Button title="登録する" onPress={handleSignUp} />
      <View style={styles.spacer} />
      <Button title="ログインに戻る" onPress={() => router.replace("/login")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  message: { color: "green", marginBottom: 12 },
  error: { color: "red", marginBottom: 12 },
  spacer: { height: 12 },
});

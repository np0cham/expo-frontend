import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function ConfirmSignUpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const username = (email ?? "").toString();

  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    try {
      setError("");
      setMessage("");

      await confirmSignUp({
        username,
        confirmationCode,
      });

      setMessage("登録確認が完了しました。ログインしてください");
      router.replace("/login");
    } catch (e: any) {
      setError(e.message ?? "確認コードの検証に失敗しました");
    }
  };

  const handleResend = async () => {
    try {
      setError("");
      setMessage("");

      await resendSignUpCode({ username });
      setMessage("確認コードを再送信しました");
    } catch (e: any) {
      setError(e.message ?? "確認コードの再送信に失敗しました");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>認証コード確認</Text>
      <Text style={styles.label}>メール: {username || "未指定"}</Text>
      <TextInput
        style={styles.input}
        placeholder="確認コード"
        value={confirmationCode}
        onChangeText={setConfirmationCode}
        keyboardType="number-pad"
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="認証する" onPress={handleConfirm} />
      <View style={styles.spacer} />
      <Button title="コードを再送信" onPress={handleResend} />
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
    marginBottom: 12,
  },
  label: {
    marginBottom: 12,
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

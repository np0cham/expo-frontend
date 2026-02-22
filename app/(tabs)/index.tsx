import { StyleSheet, View } from "react-native";

import QuestionsListScreen from "@/components/questions-list";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <QuestionsListScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

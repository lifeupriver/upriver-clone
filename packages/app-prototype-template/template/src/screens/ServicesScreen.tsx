import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';
import { content } from '../data';

export default function ServicesScreen() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>{`{{SERVICES_LABEL}}`}</Text>
        {content.services.length === 0 ? (
          <Text style={styles.empty}>Service details will appear here once your team confirms the offerings.</Text>
        ) : (
          content.services.map((s) => (
            <View key={s.name} style={styles.card}>
              <Text style={styles.cardTitle}>{s.name}</Text>
              {s.description ? <Text style={styles.cardBody}>{s.description}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  heading: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  empty: { color: theme.colors.muted, fontSize: theme.fontSize.base },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text },
  cardBody: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    lineHeight: 22,
  },
});

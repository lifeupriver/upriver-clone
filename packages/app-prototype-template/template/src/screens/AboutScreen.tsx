import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';
import { content } from '../data';

export default function AboutScreen() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>About {content.brandName}</Text>
        <Text style={styles.body}>{content.about}</Text>

        {content.team.length > 0 ? (
          <>
            <Text style={styles.subheading}>Team</Text>
            {content.team.map((member) => (
              <View key={member.name} style={styles.teamRow}>
                <Text style={styles.teamName}>{member.name}</Text>
                <Text style={styles.teamRole}>{member.role}</Text>
              </View>
            ))}
          </>
        ) : null}
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
  subheading: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  body: { fontSize: theme.fontSize.base, color: theme.colors.text, lineHeight: 24 },
  teamRow: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teamName: { fontSize: theme.fontSize.base, fontWeight: '600', color: theme.colors.text },
  teamRole: { fontSize: theme.fontSize.sm, color: theme.colors.muted, marginTop: 2 },
});

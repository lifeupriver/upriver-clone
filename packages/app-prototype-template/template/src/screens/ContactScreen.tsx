import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';
import { content } from '../data';

export default function ContactScreen() {
  const c = content.contact;
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Get in touch</Text>
        <Text style={styles.body}>
          Tap any line below to call, email, or open a map.
        </Text>

        {c.phone ? (
          <Pressable
            style={styles.action}
            onPress={() => Linking.openURL(`tel:${c.phone?.replace(/\s/g, '')}`)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${c.phone}`}
          >
            <Text style={styles.actionLabel}>CALL</Text>
            <Text style={styles.actionValue}>{c.phone}</Text>
          </Pressable>
        ) : null}

        {c.email ? (
          <Pressable
            style={styles.action}
            onPress={() => Linking.openURL(`mailto:${c.email}`)}
            accessibilityRole="button"
            accessibilityLabel={`Email ${c.email}`}
          >
            <Text style={styles.actionLabel}>EMAIL</Text>
            <Text style={styles.actionValue}>{c.email}</Text>
          </Pressable>
        ) : null}

        {c.address ? (
          <Pressable
            style={styles.action}
            onPress={() =>
              Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(c.address ?? '')}`)
            }
            accessibilityRole="button"
            accessibilityLabel={`Open map for ${c.address}`}
          >
            <Text style={styles.actionLabel}>VISIT</Text>
            <Text style={styles.actionValue}>{c.address}</Text>
          </Pressable>
        ) : null}

        {c.hours ? (
          <View style={styles.hoursBlock}>
            <Text style={styles.actionLabel}>HOURS</Text>
            <Text style={styles.actionValue}>{c.hours}</Text>
          </View>
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
    marginBottom: theme.spacing.sm,
  },
  body: { fontSize: theme.fontSize.base, color: theme.colors.muted, marginBottom: theme.spacing.lg },
  action: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  hoursBlock: { paddingVertical: theme.spacing.md },
  actionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  actionValue: { fontSize: theme.fontSize.base, color: theme.colors.text },
});

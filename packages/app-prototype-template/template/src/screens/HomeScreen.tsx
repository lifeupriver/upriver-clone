import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';
import { content } from '../data';

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {content.heroImage ? (
          <Image source={{ uri: content.heroImage }} style={styles.hero} contentFit="cover" />
        ) : (
          <View style={[styles.hero, styles.heroFallback]} />
        )}
        <View style={styles.body}>
          <Text style={styles.brand}>{content.brandName}</Text>
          <Text style={styles.tagline}>{content.tagline}</Text>
          <Text style={styles.about}>{content.about}</Text>
          {content.galleryImages.length > 0 ? (
            <View style={styles.galleryGrid}>
              {content.galleryImages.slice(0, 4).map((src) => (
                <Image key={src} source={{ uri: src }} style={styles.galleryItem} contentFit="cover" />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingBottom: theme.spacing.xl },
  hero: { width: '100%', height: 280 },
  heroFallback: { backgroundColor: theme.colors.primary },
  body: { padding: theme.spacing.lg },
  brand: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
  },
  about: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text,
    lineHeight: 24,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  galleryItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
  },
});

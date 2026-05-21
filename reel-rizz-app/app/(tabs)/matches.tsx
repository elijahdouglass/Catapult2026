import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useClerk } from '@clerk/clerk-expo';
import { api } from '@/api/client';
import { useAuth } from '@/context/auth';
import { Colors } from '@/constants/theme';
import { VerifiedBadge } from '@/components/verified-badge';
import { useWorldIdVerify } from '@/components/world-id-verify';

interface Match {
  userId: number;
  displayName: string;
  igUsername: string;
  tags: string;
  similarityScore: number;
  worldIdVerified?: boolean;
}

export default function MatchesScreen() {
  const { user, refreshUser } = useAuth();
  const { signOut } = useClerk();
  const logout = () => signOut();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { open: openWorldId } = useWorldIdVerify({ onVerified: refreshUser });

  useEffect(() => {
    api
      .get<Match[]>('/matches')
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.rose500} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Your Matches</Text>
            <Text style={styles.subtitle}>Mutual vibes — connect on Instagram</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {user?.worldIdVerified ? (
              <VerifiedBadge />
            ) : (
              <TouchableOpacity
                onPress={openWorldId}
                style={styles.verifyBtn}
              >
                <Ionicons name="shield-checkmark" size={16} color={Colors.rose500} />
                <Text style={styles.verifyBtnText}>Verify</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#777" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {matches.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <Text style={styles.emptyIcon}>💝</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyDesc}>
            Keep liking people on Discover — when someone likes you back, they'll show
            up here
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.userId.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item: m, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 80)} style={styles.card}>
              <View style={styles.cardLeft}>
                <LinearGradient
                  colors={[Colors.rose400, Colors.hotPink]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarLetter}>
                    {m.displayName.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={styles.info}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.name}>{m.displayName}</Text>
                    {m.worldIdVerified && <VerifiedBadge compact />}
                  </View>
                  <Text style={styles.score}>{m.similarityScore}% match</Text>
                  <View style={styles.tags}>
                    {m.tags
                      .split(',')
                      .slice(0, 4)
                      .map((tag, j) => (
                        <View key={j} style={styles.tagPill}>
                          <Text style={styles.tagText}>{tag.trim()}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`https://instagram.com/${m.igUsername}`)
                }
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.rose500, Colors.hotPink]}
                  style={styles.igBtn}
                >
                  <Ionicons name="logo-instagram" size={16} color="#fff" />
                  <Text style={styles.igText}>@{m.igUsername}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d0d12',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d12',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoutBtn: {
    padding: 8,
    marginTop: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f0e6db',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(25,25,35,0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0e6db',
  },
  score: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rose500,
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  tagPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tagText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  igBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  igText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f0e6db',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 21,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    backgroundColor: 'rgba(244,63,94,0.08)',
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.rose500,
  },
});

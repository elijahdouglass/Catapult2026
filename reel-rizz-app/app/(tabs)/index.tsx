import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { api } from '@/api/client';
import { Colors } from '@/constants/theme';
import { VerifiedBadge } from '@/components/verified-badge';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* ── types ─────────────────────────────────────── */

interface ReelInfo {
  reelId: string;
  videoUrl: string | null;
}

interface FeedPerson {
  userId: number;
  displayName: string;
  igUsername: string | null;
  tags: string | null;
  similarityScore: number;
  reels: ReelInfo[];
  worldIdVerified?: boolean;
}

interface FeedResponse {
  feed: FeedPerson[];
  likedReelIds: string[];
  likeThreshold: number;
}

interface ReelLikeResponse {
  likeCount: number;
  threshold: number;
  personLiked: boolean;
  mutual: boolean;
  matchInfo: { displayName: string; igUsername: string } | null;
}

interface VideoResponse {
  status: string;
  data: { videoUrl: string };
}

type FeedItem =
  | { kind: 'intro'; person: FeedPerson; key: string }
  | { kind: 'reel'; person: FeedPerson; reelId: string; videoUrl: string | null; index: number; key: string };

/* ── video url cache ──────────────────────────── */

const videoUrlCache = new Map<string, string>();

async function fetchVideoUrl(reelId: string, directUrl: string | null): Promise<string | null> {
  if (videoUrlCache.has(reelId)) return videoUrlCache.get(reelId)!;
  // Use direct CDN URL from webhook if available
  if (directUrl) {
    videoUrlCache.set(reelId, directUrl);
    return directUrl;
  }
  // Fallback: resolve via Instagram proxy
  try {
    const json = await api.get<VideoResponse>(
      `/video?postUrl=${encodeURIComponent(`https://www.instagram.com/reel/${reelId}/`)}`
    );
    if (json.status === 'success' && json.data?.videoUrl) {
      videoUrlCache.set(reelId, json.data.videoUrl);
      return json.data.videoUrl;
    }
  } catch {}
  return null;
}

/* ── ReelSlide ────────────────────────────────── */

const ReelSlide = memo(function ReelSlide({
  item,
  liked,
  likeCountForPerson,
  threshold,
  onLike,
  onUnlike,
  isVisible,
  slideHeight,
}: {
  item: FeedItem & { kind: 'reel' };
  liked: boolean;
  likeCountForPerson: number;
  threshold: number;
  onLike: (reelId: string, ownerId: number) => void;
  onUnlike: (reelId: string, ownerId: number) => void;
  isVisible: boolean;
  slideHeight: number;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchVideoUrl(item.reelId, item.videoUrl).then((url) => {
      if (!cancelled) {
        setVideoUrl(url);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [item.reelId]);

  const player = useVideoPlayer(videoUrl ?? '', (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (!player) return;
    if (isVisible && videoUrl) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, videoUrl, player]);

  const handleHeart = () => {
    if (liked) {
      onUnlike(item.reelId, item.person.userId);
    } else {
      onLike(item.reelId, item.person.userId);
      heartScale.value = withSequence(
        withSpring(1.4, { damping: 4 }),
        withSpring(1, { damping: 6 })
      );
    }
  };

  const reelLabel = `${item.index + 1}/${item.person.reels.length}`;

  return (
    <View style={[styles.slide, { height: slideHeight }]}>
      {loading ? (
        <View style={styles.shimmer}>
          <ActivityIndicator color={Colors.rose500} size="large" />
        </View>
      ) : videoUrl ? (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />
      ) : (
        <View style={styles.errorSlide}>
          <Ionicons name="videocam-off-outline" size={40} color="rgba(255,255,255,0.3)" />
          <Text style={styles.errorText}>Reel unavailable</Text>
        </View>
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.25, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.personChip}>
          <LinearGradient
            colors={[Colors.rose500, Colors.hotPink]}
            style={styles.avatarDot}
          >
            <Text style={styles.avatarLetter}>
              {item.person.displayName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.personName}>{item.person.displayName}</Text>
          {item.person.worldIdVerified && <VerifiedBadge compact />}
        </View>
        <View style={styles.reelBadge}>
          <Text style={styles.reelBadgeText}>{reelLabel}</Text>
        </View>
      </View>

      {/* Right action column */}
      <View style={styles.actionColumn}>
        <TouchableOpacity onPress={handleHeart} activeOpacity={0.7}>
          <Animated.View style={[styles.heartBtn, heartStyle]}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={32}
              color={liked ? Colors.hotPink : 'rgba(255,255,255,0.85)'}
            />
          </Animated.View>
        </TouchableOpacity>
        <View style={styles.likeCounter}>
          <Text
            style={[
              styles.likeNum,
              likeCountForPerson >= threshold && { color: Colors.hotPink },
            ]}
          >
            {likeCountForPerson}
          </Text>
          <Text style={styles.likeSlash}>/{threshold}</Text>
        </View>
      </View>
    </View>
  );
});

/* ── IntroCard ────────────────────────────────── */

function IntroCard({ person, slideHeight }: { person: FeedPerson; slideHeight: number }) {
  const tags = person.tags
    ? person.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <View style={[styles.slide, { height: slideHeight }]}>
      <LinearGradient
        colors={['#1a0525', '#0d0d1a', '#0a1525']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View entering={FadeInUp.duration(500)} style={styles.introContent}>
        {/* Similarity ring */}
        <LinearGradient
          colors={[Colors.hotPink, Colors.rose400, Colors.hotPink]}
          style={styles.simRingOuter}
        >
          <View style={styles.simRingInner}>
            <Text style={styles.simNumber}>{person.similarityScore}</Text>
            <Text style={styles.simLabel}>%</Text>
          </View>
        </LinearGradient>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.introName}>{person.displayName}</Text>
          {person.worldIdVerified && <VerifiedBadge />}
        </View>

        {tags.length > 0 && (
          <View style={styles.introTags}>
            {tags.slice(0, 6).map((tag, i) => (
              <View key={i} style={styles.introTagPill}>
                <Text style={styles.introTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.introPrompt}>
          <Ionicons name="chevron-down" size={22} color="#777" />
          <Text style={styles.introPromptText}>Swipe up to see their reels</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/* ── MatchPopup ───────────────────────────────── */

function MatchPopup({
  matchInfo,
  onDismiss,
}: {
  matchInfo: { displayName: string; igUsername: string };
  onDismiss: () => void;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.matchOverlay}>
        <Animated.View entering={ZoomIn.springify()} style={styles.matchCard}>
          <Text style={styles.matchEmoji}>💖</Text>
          <Text style={styles.matchTitle}>It's a Match!</Text>
          <Text style={styles.matchSub}>
            You and <Text style={{ fontWeight: '700' }}>{matchInfo.displayName}</Text>{' '}
            vibed on each other's reels
          </Text>

          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={[Colors.rose500, Colors.hotPink]}
              style={styles.matchIgBtn}
            >
              <Ionicons name="logo-instagram" size={18} color="#fff" />
              <Text style={styles.matchIgText}>@{matchInfo.igUsername}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Pressable onPress={onDismiss} style={styles.matchDismiss}>
            <Text style={styles.matchDismissText}>Keep Swiping</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ── main component ───────────────────────────── */

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const slideHeight = SCREEN_H - tabBarHeight;

  const [feed, setFeed] = useState<FeedPerson[]>([]);
  const [likedReelIds, setLikedReelIds] = useState<Set<string>>(new Set());
  const [likeThreshold, setLikeThreshold] = useState(3);
  const [personLikeCounts, setPersonLikeCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState<{
    displayName: string;
    igUsername: string;
  } | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    const qs = verifiedOnly ? '?verifiedOnly=true' : '';
    api
      .get<FeedResponse>(`/discover/feed${qs}`)
      .then((data) => {
        setFeed(data.feed);
        setLikedReelIds(new Set(data.likedReelIds));
        setLikeThreshold(data.likeThreshold);
        const counts = new Map<number, number>();
        for (const person of data.feed) {
          let c = 0;
          for (const r of person.reels) {
            if (data.likedReelIds.includes(r.reelId)) c++;
          }
          if (c > 0) counts.set(person.userId, c);
        }
        setPersonLikeCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [verifiedOnly]);

  const items: FeedItem[] = [];
  for (const person of feed) {
    items.push({ kind: 'intro', person, key: `intro-${person.userId}` });
    person.reels.forEach((reel, index) => {
      items.push({ kind: 'reel', person, reelId: reel.reelId, videoUrl: reel.videoUrl, index, key: `reel-${reel.reelId}` });
    });
  }

  const handleLike = useCallback(async (reelId: string, ownerId: number) => {
    setLikedReelIds((prev) => new Set(prev).add(reelId));
    setPersonLikeCounts((prev) => {
      const next = new Map(prev);
      next.set(ownerId, (next.get(ownerId) || 0) + 1);
      return next;
    });

    try {
      const res = await api.post<ReelLikeResponse>('/discover/reel-like', {
        reelId,
        ownerId,
      });
      setPersonLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(ownerId, res.likeCount);
        return next;
      });
      if (res.mutual && res.matchInfo) {
        setMatchPopup(res.matchInfo);
      }
    } catch {
      setLikedReelIds((prev) => {
        const next = new Set(prev);
        next.delete(reelId);
        return next;
      });
      setPersonLikeCounts((prev) => {
        const next = new Map(prev);
        const cur = next.get(ownerId) || 1;
        if (cur <= 1) next.delete(ownerId);
        else next.set(ownerId, cur - 1);
        return next;
      });
    }
  }, []);

  const handleUnlike = useCallback(async (reelId: string, ownerId: number) => {
    setLikedReelIds((prev) => {
      const next = new Set(prev);
      next.delete(reelId);
      return next;
    });
    setPersonLikeCounts((prev) => {
      const next = new Map(prev);
      const cur = next.get(ownerId) || 1;
      if (cur <= 1) next.delete(ownerId);
      else next.set(ownerId, cur - 1);
      return next;
    });
    try {
      await api.post('/discover/reel-unlike', { reelId });
    } catch {
      setLikedReelIds((prev) => new Set(prev).add(reelId));
      setPersonLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(ownerId, (next.get(ownerId) || 0) + 1);
        return next;
      });
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setVisibleIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      if (item.kind === 'intro') {
        return <IntroCard person={item.person} slideHeight={slideHeight} />;
      }
      return (
        <ReelSlide
          item={item}
          liked={likedReelIds.has(item.reelId)}
          likeCountForPerson={personLikeCounts.get(item.person.userId) || 0}
          threshold={likeThreshold}
          onLike={handleLike}
          onUnlike={handleUnlike}
          isVisible={index === visibleIndex}
          slideHeight={slideHeight}
        />
      );
    },
    [likedReelIds, personLikeCounts, likeThreshold, handleLike, handleUnlike, visibleIndex, slideHeight]
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#0a0a0f' }]}>
        <ActivityIndicator size="large" color={Colors.rose500} />
      </View>
    );
  }

  if (feed.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: '#0a0a0f' }]}>
        <Animated.View entering={FadeIn} style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={styles.emptyTitle}>No reels to discover yet</Text>
          <Text style={styles.emptyDesc}>
            When people start watching reels with the extension, their content will
            appear here for you to vibe with
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <TouchableOpacity
        onPress={() => setVerifiedOnly((v) => !v)}
        activeOpacity={0.8}
        style={[
          styles.filterBtn,
          { top: insets.top + 8 },
          verifiedOnly && styles.filterBtnActive,
        ]}
      >
        <Ionicons
          name="checkmark-circle"
          size={14}
          color={verifiedOnly ? '#fff' : '#22c55e'}
        />
        <Text style={[styles.filterText, verifiedOnly && styles.filterTextActive]}>
          Verified Only
        </Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={slideHeight}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: slideHeight,
          offset: slideHeight * index,
          index,
        })}
      />

      {matchPopup && (
        <MatchPopup matchInfo={matchPopup} onDismiss={() => setMatchPopup(null)} />
      )}
    </View>
  );
}

/* ── styles ───────────────────────────────────── */

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    width: SCREEN_W,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorSlide: {
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  personName: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '600',
  },
  reelBadge: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },

  // Action column
  actionColumn: {
    position: 'absolute',
    right: 16,
    bottom: '20%',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  heartBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  likeCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 2,
  },
  likeNum: {
    fontWeight: '700',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  likeSlash: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },

  // Intro card
  introContent: {
    zIndex: 1,
    alignItems: 'center',
    gap: 20,
    padding: 24,
  },
  simRingOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simRingInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#0d0d1a',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingTop: 28,
  },
  simNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.hotPink,
  },
  simLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.rose400,
    marginLeft: 2,
  },
  introName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f0e6db',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  introTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 340,
  },
  introTagPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  introTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#bbb',
  },
  introPrompt: {
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  introPromptText: {
    color: '#777',
    fontSize: 14,
  },

  // Match popup
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
    paddingHorizontal: 40,
    borderRadius: 24,
    backgroundColor: 'rgba(45,10,62,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.25)',
    maxWidth: 360,
    width: '90%',
  },
  matchEmoji: {
    fontSize: 48,
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.hotPink,
    letterSpacing: -0.3,
  },
  matchSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 260,
  },
  matchIgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    marginTop: 8,
  },
  matchIgText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  matchDismiss: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  matchDismissText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
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
  filterBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(25,25,35,0.85)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterBtnActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ccc',
  },
  filterTextActive: {
    color: '#fff',
  },
});

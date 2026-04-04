import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { api } from '@/api/client';
import { Colors } from '@/constants/theme';

export default function OnboardingScreen() {
  const { refreshUser } = useAuth();
  const [igUsername, setIgUsername] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[] | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri || !igUsername) return;
    setLoading(true);

    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'screenshot.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('screenshot', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
      formData.append('igUsername', igUsername);

      const data = await api.post<{ tags: string[] }>('/onboarding', formData);
      setTags(data.tags);
      await refreshUser();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (tags) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Animated.Text entering={FadeInUp.delay(0)} style={styles.successEmoji}>
            ❤️
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(100)} style={styles.successTitle}>
            Vibes captured!
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(200)} style={styles.successSub}>
            Here's what we found in your feed:
          </Animated.Text>
          <View style={styles.tagCloud}>
            {tags.map((tag, i) => (
              <Animated.View
                key={i}
                entering={FadeInUp.delay(300 + i * 60)}
                style={styles.tagPill}
              >
                <Text style={styles.tagText}>{tag}</Text>
              </Animated.View>
            ))}
          </View>
          <Animated.View entering={FadeInUp.delay(600)} style={styles.redirectRow}>
            <ActivityIndicator color={Colors.rose500} size="small" />
            <Text style={styles.redirectText}>Taking you to discover matches...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={styles.title}>Set up your vibe</Text>
            <Text style={styles.subtitle}>
              Upload a screenshot of your Instagram Explore feed so we can find people on
              your wavelength.
            </Text>

            {/* Image picker */}
            <TouchableOpacity
              style={[styles.dropzone, imageUri && styles.dropzoneHasFile]}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.preview} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={40} color={Colors.rose400} />
                  <Text style={styles.dropText}>
                    Tap to choose a screenshot
                  </Text>
                  <Text style={styles.dropHint}>PNG, JPG up to 10MB</Text>
                </>
              )}
            </TouchableOpacity>

            {/* IG username */}
            <View style={styles.field}>
              <Text style={styles.label}>Instagram username</Text>
              <View style={styles.igWrap}>
                <Text style={styles.igAt}>@</Text>
                <TextInput
                  style={styles.igInput}
                  placeholder="yourusername"
                  placeholderTextColor="#666"
                  value={igUsername}
                  onChangeText={setIgUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || !imageUri || !igUsername}
              activeOpacity={0.8}
              style={{ opacity: !imageUri || !igUsername ? 0.5 : 1 }}
            >
              <LinearGradient
                colors={[Colors.rose500, Colors.hotPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtn}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.submitText}>Reading your vibes...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>Analyze my feed</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d0d12' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: 'rgba(25,25,35,0.9)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0e6db',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    lineHeight: 21,
    marginBottom: 24,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,67,111,0.25)',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232,67,111,0.02)',
    marginBottom: 20,
  },
  dropzoneHasFile: {
    padding: 12,
    borderStyle: 'solid',
    borderColor: Colors.rose400,
  },
  dropText: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  dropHint: {
    fontSize: 12,
    color: '#666',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#bbb',
    marginBottom: 6,
    marginLeft: 2,
  },
  igWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  igAt: {
    position: 'absolute',
    left: 14,
    color: '#777',
    fontWeight: '500',
    fontSize: 15,
    zIndex: 1,
  },
  igInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    paddingLeft: 36,
    fontSize: 15,
    color: '#f0e6db',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  submitBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0e6db',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 340,
  },
  tagPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagText: {
    fontSize: 13,
    color: '#bbb',
    fontWeight: '500',
  },
  redirectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
  },
  redirectText: {
    fontSize: 14,
    color: '#777',
  },
});

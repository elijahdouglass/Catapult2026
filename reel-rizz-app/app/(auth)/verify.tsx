import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/api/client';
import { useAuth } from '@/context/auth';
import { Colors } from '@/constants/theme';

export default function VerifyScreen() {
  const { pendingVerifyCode, refreshUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.get<{ igVerified: boolean }>('/auth/verify-status');
        if (data.igVerified) {
          setPolling(false);
          await refreshUser();
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  const handleCopy = async () => {
    if (pendingVerifyCode) {
      await Clipboard.setStringAsync(pendingVerifyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInstagramDM = () => {
    Linking.openURL('https://ig.me/m/reel.rizz_');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="chatbubble-ellipses" size={48} color={Colors.rose500} />
          </View>

          <Text style={styles.title}>Verify your Instagram</Text>
          <Text style={styles.subtitle}>
            DM this code to{' '}
            <Text style={styles.accent}>@reel.rizz_</Text>
            {' '}on Instagram to verify your account.
          </Text>

          {pendingVerifyCode ? (
            <TouchableOpacity style={styles.codeBox} onPress={handleCopy} activeOpacity={0.7}>
              <Text style={styles.codeText}>{pendingVerifyCode}</Text>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={20}
                color={copied ? '#22c55e' : '#777'}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.codeBox}>
              <Text style={[styles.codeText, { color: '#777' }]}>Code unavailable</Text>
            </View>
          )}

          {copied && <Text style={styles.copiedText}>Copied!</Text>}

          <TouchableOpacity onPress={openInstagramDM} activeOpacity={0.8}>
            <LinearGradient
              colors={[Colors.rose500, Colors.hotPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dmBtn}
            >
              <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.dmBtnText}>Open Instagram DM</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.waitingRow}>
            <ActivityIndicator size="small" color={Colors.rose500} />
            <Text style={styles.waitingText}>Waiting for verification...</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d0d12' },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(25,25,35,0.9)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244,63,94,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f0e6db',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  accent: {
    color: Colors.rose500,
    fontWeight: '600',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    marginBottom: 8,
    gap: 12,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f0e6db',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 3,
  },
  copiedText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
    marginBottom: 16,
  },
  dmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  dmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  waitingText: {
    fontSize: 13,
    color: '#777',
  },
});

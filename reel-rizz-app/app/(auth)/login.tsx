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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [igUsername, setIgUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName, igUsername);
        router.replace('/(auth)/verify');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
            {/* Logo area */}
            <Text style={styles.logoText}>Reel Rizz</Text>

            <Text style={styles.title}>
              {mode === 'login' ? 'Welcome back' : 'Join the vibe'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Sign in to find your match'
                : 'Create your account and start matching'}
            </Text>

            {/* Mode toggle */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
                onPress={() => setMode('login')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    mode === 'login' && styles.toggleTextActive,
                  ]}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
                onPress={() => setMode('register')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    mode === 'register' && styles.toggleTextActive,
                  ]}
                >
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            {mode === 'register' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Display name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="#666"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Instagram username</Text>
                  <View style={styles.igRow}>
                    <Text style={styles.igAt}>@</Text>
                    <TextInput
                      style={[styles.input, styles.igInput]}
                      placeholder="your_username"
                      placeholderTextColor="#666"
                      value={igUsername}
                      onChangeText={setIgUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.rose500, Colors.hotPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchLink}>
                  {mode === 'login' ? 'Register' : 'Sign in'}
                </Text>
              </Text>
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
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.rose500,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0e6db',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginBottom: 24,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(232,67,111,0.06)',
    borderRadius: 999,
    padding: 3,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#777',
  },
  toggleTextActive: {
    color: Colors.rose500,
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#bbb',
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#f0e6db',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  igRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  igAt: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.rose500,
    marginRight: 8,
  },
  igInput: {
    flex: 1,
  },
  submitBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#777',
  },
  switchLink: {
    color: Colors.rose500,
    fontWeight: '600',
  },
});

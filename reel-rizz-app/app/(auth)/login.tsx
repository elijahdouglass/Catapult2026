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
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { Colors } from '@/constants/theme';

type Mode = 'login' | 'register';
// 'email-code' covers two flows: the email-verification step after sign-up,
// and the first-factor email code when sign-in returns `needs_first_factor`
// with email_code as the only/preferred strategy.
type Step = 'form' | 'email-code' | 'signin-email-code';

// Clerk-backed sign-in / sign-up. Two-step sign-up: collect the form, then
// prompt for the email verification code Clerk sends. After session is
// active, the root navigator routes the user to /verify (claim IG handle +
// DM code) or /onboarding (screenshot upload) based on /me.
export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const handleLogin = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      switch (result.status) {
        case 'complete':
          await setActiveSignIn({ session: result.createdSessionId });
          return;
        case 'needs_first_factor': {
          // Password didn't satisfy the first factor (e.g. passwordless
          // user, or instance configured for email-code only). Fall back
          // to email_code if it's offered.
          const emailFactor = result.supportedFirstFactors?.find(
            (f) => f.strategy === 'email_code',
          ) as { emailAddressId: string } | undefined;
          if (emailFactor) {
            await signIn.prepareFirstFactor({
              strategy: 'email_code',
              emailAddressId: emailFactor.emailAddressId,
            });
            setStep('signin-email-code');
            return;
          }
          Alert.alert(
            'Additional sign-in step required',
            'Your account requires a sign-in method this app doesn\u2019t support yet. Please sign in on the web.',
          );
          return;
        }
        case 'needs_second_factor':
          Alert.alert(
            'Two-factor authentication required',
            'Please sign in on the web to complete two-factor authentication, then return to the app.',
          );
          return;
        case 'needs_new_password':
          Alert.alert(
            'Password reset required',
            'Please reset your password on the web before signing in.',
          );
          return;
        case 'needs_identifier':
          Alert.alert('Sign-in', 'Please enter your email and try again.');
          return;
        default:
          Alert.alert('Sign-in incomplete', `Status: ${result.status}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || err.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('email-code');
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || err.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId });
      } else {
        Alert.alert('Verification incomplete', `Status: ${result.status}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignInEmailCode = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId });
      } else {
        Alert.alert('Sign-in incomplete', `Status: ${result.status}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || err.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (step === 'email-code') return handleVerifyEmail();
    if (step === 'signin-email-code') return handleSignInEmailCode();
    return mode === 'login' ? handleLogin() : handleRegister();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <Text style={styles.logoText}>Reel Rizz</Text>

            <Text style={styles.title}>
              {step === 'email-code' || step === 'signin-email-code'
                ? 'Check your email'
                : mode === 'login'
                ? 'Welcome back'
                : 'Join the vibe'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email-code'
                ? `Enter the code we sent to ${email}`
                : step === 'signin-email-code'
                ? `Enter the code we sent to ${email} to finish signing in`
                : mode === 'login'
                ? 'Sign in to find your match'
                : 'Create your account and start matching'}
            </Text>

            {step === 'form' && (
              <View style={styles.toggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
                  onPress={() => setMode('login')}
                >
                  <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                    Sign in
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
                  onPress={() => setMode('register')}
                >
                  <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                    Register
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'form' && (
              <>
                <Field label="Email">
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
                </Field>
                <Field label="Password">
                  <TextInput
                    style={styles.input}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </Field>
              </>
            )}

            {(step === 'email-code' || step === 'signin-email-code') && (
              <Field label="Verification code">
                <TextInput
                  style={styles.input}
                  placeholder="123456"
                  placeholderTextColor="#666"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
              </Field>
            )}

            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
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
                    {step === 'email-code'
                      ? 'Verify email'
                      : step === 'signin-email-code'
                      ? 'Sign in'
                      : mode === 'login'
                      ? 'Sign in'
                      : 'Create account'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {step === 'form' && (
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
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d0d12' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
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
  subtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 24 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(232,67,111,0.06)',
    borderRadius: 999,
    padding: 3,
    marginBottom: 24,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#777' },
  toggleTextActive: { color: Colors.rose500, fontWeight: '600' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#bbb', marginBottom: 6, marginLeft: 2 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#f0e6db',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  igRow: { flexDirection: 'row', alignItems: 'center' },
  igAt: { fontSize: 16, fontWeight: '600', color: Colors.rose500, marginRight: 8 },
  igInput: { flex: 1 },
  submitBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#777' },
  switchLink: { color: Colors.rose500, fontWeight: '600' },
});

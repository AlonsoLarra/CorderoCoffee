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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/colors';
import { COPY } from '@/lib/copy';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register';

export default function AccesoScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setError(COPY.auth.errorMissingFields);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: authError } = await signIn(email, password);
        if (authError) {
          setError(COPY.auth.errorInvalidCredentials);
        } else {
          router.replace('/');
        }
      } else {
        const { error: authError } = await signUp(email, password);
        if (authError) {
          setError(authError.message ?? COPY.auth.errorGeneric);
        } else {
          setSuccessMsg(COPY.auth.successRegister);
        }
      }
    } catch {
      setError(COPY.auth.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mark */}
          <Text style={styles.mark}>♦</Text>

          <Text style={styles.title}>{COPY.auth.title}</Text>
          <Text style={styles.subtitle}>{COPY.auth.subtitle}</Text>

          {/* Mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
              onPress={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
            >
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                {COPY.auth.loginButton}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
              onPress={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
            >
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                {COPY.auth.registerButton}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>{COPY.auth.emailLabel}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>{COPY.auth.passwordLabel}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.cream} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'login'
                    ? COPY.auth.loginButton.toUpperCase()
                    : COPY.auth.registerButton.toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => router.push('/pedido')}
              activeOpacity={0.7}
            >
              <Text style={styles.guestBtnText}>
                {COPY.actions.continueAsGuest.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 48,
  },
  mark: {
    fontSize: 28,
    color: COLORS.espresso,
    opacity: 0.4,
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: COLORS.espresso,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    marginBottom: 32,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.espresso,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  toggleTextActive: {
    color: COLORS.cream,
  },
  form: {},
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: COLORS.espresso,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.espresso,
    backgroundColor: COLORS.card,
  },
  errorBox: {
    marginTop: 16,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: 'rgba(181,78,42,0.2)',
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
  },
  successBox: {
    marginTop: 16,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: 'rgba(58,105,67,0.2)',
    padding: 12,
  },
  successText: {
    fontSize: 13,
    color: COLORS.success,
  },
  submitBtn: {
    backgroundColor: COLORS.espresso,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.5,
  },
  guestBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guestBtnText: {
    color: COLORS.espresso,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    opacity: 0.6,
  },
});

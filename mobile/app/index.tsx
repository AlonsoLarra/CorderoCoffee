import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/colors';
import { COPY } from '@/lib/copy';
import { useAuth } from '@/context/AuthContext';

const { height } = Dimensions.get('window');

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Elige en línea',
    body: 'Explora el menú y arma tu pedido desde donde estés, con calma y sin prisa.',
  },
  {
    n: '02',
    title: 'Elige tu momento',
    body: 'Reserva tu horario de recolección. Lo tenemos listo en punto.',
  },
  {
    n: '03',
    title: 'Llega y recoge',
    body: 'Sigue el estado en tiempo real. Tu bebida, lista en su punto al llegar.',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Nav */}
      <View style={styles.nav}>
        <Text style={styles.navBrand}>CORDERO</Text>
        {user ? (
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.navLink}>{COPY.actions.signOut}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/acceso')}>
            <Text style={styles.navLink}>Iniciar sesión</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { minHeight: height * 0.75 }]}>
          {/* Ambient glow */}
          <View style={styles.glow} pointerEvents="none" />

          {/* Logo lockup */}
          <View style={styles.logoContainer}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>♦</Text>
            </View>
            <Text style={styles.logoName}>Cordero</Text>
            <Text style={styles.logoSub}>Coffee Club</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.tagline}>{COPY.brand.tagline}</Text>
          <Text style={styles.intro}>{COPY.brand.intro}</Text>

          {/* CTAs */}
          <View style={styles.ctas}>
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.8}
              onPress={() => router.push('/pedido')}
            >
              <Text style={styles.btnPrimaryText}>
                {COPY.actions.startOrder.toUpperCase()}
              </Text>
            </TouchableOpacity>

            {!user && (
              <TouchableOpacity
                style={styles.btnSecondary}
                activeOpacity={0.8}
                onPress={() => router.push('/acceso')}
              >
                <Text style={styles.btnSecondaryText}>
                  {COPY.actions.accessAccount.toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>CÓMO FUNCIONA</Text>
            <View style={styles.sectionLine} />
          </View>

          {HOW_IT_WORKS.map((item) => (
            <View key={item.n} style={styles.step}>
              <Text style={styles.stepNumber}>{item.n}</Text>
              <View style={styles.stepAccent} />
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepBody}>{item.body}</Text>
            </View>
          ))}
        </View>

        {/* Manifesto */}
        <View style={styles.manifesto}>
          <Text style={styles.manifestoMark}>♦</Text>
          <Text style={styles.manifestoQuote}>
            {'"Hecho con cuidado,\npara quien sabe apreciarlo."'}
          </Text>
          <View style={styles.manifestoDivider} />
          <TouchableOpacity
            style={styles.manifestoBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/pedido')}
          >
            <Text style={styles.manifestoBtnText}>
              {COPY.actions.startOrder.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Cordero Coffee Club</Text>
          <Text style={styles.footerCopy}>
            © {new Date().getFullYear()} — Cordero Coffee Club
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  navBrand: {
    fontSize: 10,
    letterSpacing: 4,
    color: COLORS.espresso,
    fontWeight: '600',
  },
  navLink: {
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.espresso,
    opacity: 0.45,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 60,
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(210,185,160,0.35)',
    top: '20%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoMark: {
    marginBottom: 12,
  },
  logoMarkText: {
    fontSize: 32,
    color: COLORS.espresso,
    opacity: 0.7,
  },
  logoName: {
    fontSize: 36,
    fontWeight: '300',
    color: COLORS.espresso,
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  logoSub: {
    fontSize: 11,
    letterSpacing: 5,
    color: COLORS.espresso,
    opacity: 0.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(63,41,28,0.14)',
    marginBottom: 28,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(63,41,28,0.82)',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 16,
  },
  intro: {
    fontSize: 15,
    color: 'rgba(63,41,28,0.48)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    marginBottom: 48,
  },
  ctas: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.espresso,
    paddingHorizontal: 48,
    paddingVertical: 18,
    width: '100%',
  },
  btnPrimaryText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.5,
    textAlign: 'center',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(63,41,28,0.18)',
    paddingHorizontal: 48,
    paddingVertical: 18,
    width: '100%',
  },
  btnSecondaryText: {
    color: COLORS.espresso,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.5,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 56,
    backgroundColor: COLORS.cream,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 48,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(63,41,28,0.1)',
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 4,
    color: 'rgba(63,41,28,0.32)',
    fontWeight: '600',
  },
  step: {
    marginBottom: 40,
  },
  stepNumber: {
    fontSize: 56,
    fontWeight: '500',
    color: 'rgba(63,41,28,0.06)',
    lineHeight: 60,
    marginBottom: 12,
  },
  stepAccent: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(190,120,70,0.55)',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 19,
    fontWeight: '400',
    color: COLORS.espresso,
    marginBottom: 8,
  },
  stepBody: {
    fontSize: 14,
    color: 'rgba(63,41,28,0.52)',
    lineHeight: 22,
  },
  manifesto: {
    backgroundColor: COLORS.espresso,
    paddingHorizontal: 32,
    paddingVertical: 64,
    alignItems: 'center',
  },
  manifestoMark: {
    fontSize: 24,
    color: 'rgba(232,225,216,0.3)',
    marginBottom: 32,
  },
  manifestoQuote: {
    fontSize: 26,
    fontWeight: '300',
    color: COLORS.cream,
    textAlign: 'center',
    lineHeight: 38,
  },
  manifestoDivider: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(232,225,216,0.2)',
    marginVertical: 36,
  },
  manifestoBtn: {
    borderWidth: 1,
    borderColor: 'rgba(232,225,216,0.28)',
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  manifestoBtnText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.5,
  },
  footer: {
    backgroundColor: COLORS.espresso,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,225,216,0.08)',
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    letterSpacing: 4,
    color: 'rgba(232,225,216,0.32)',
  },
  footerCopy: {
    fontSize: 9,
    letterSpacing: 3,
    color: 'rgba(232,225,216,0.18)',
    textTransform: 'uppercase',
  },
});

import { StyleSheet } from 'react-native';

export const colors = {
  // Cuerpo de la calculadora
  bg: '#1c1f2a',
  surface: '#252836',
  surfaceAlt: '#2e3245',

  // Pantalla LCD
  lcdBg: '#9db89a',
  lcdBgDark: '#8aab78',
  lcdText: '#1a2e1a',
  lcdTextDim: '#4a6b4a',
  lcdBorder: '#6a8f6a',

  // Botones
  keyBg: '#2e3245',
  keyBgAlt: '#3a3f55',       // fila superior / funciones
  keyOk: '#c0392b',          // botón OK/Enter — rojo Casio
  keyOkShadow: '#7b241c',
  keyShadow: '#1a1d2a',
  keyText: '#e8eaf0',
  keyTextAlt: '#a0c4ff',     // texto azul para funciones

  // Acento battle
  accent: '#c0392b',
  success: '#27ae60',
  warning: '#e67e22',
  eliminated: '#c0392b',

  textPrimary: '#e8eaf0',
  textSecondary: '#8890aa',
  textMuted: '#4a5068',
  border: '#3a3f55',
};

export const fonts = {
  title: 'BebasNeue_400Regular',
  body: 'Rajdhani_600SemiBold',
  bodyBold: 'Rajdhani_700Bold',
  bodyMedium: 'Rajdhani_500Medium',
  mono: 'ShareTechMono_400Regular',
};

export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 50 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // LCD display box — usar componente LcdScreen en su lugar
  lcd: {
    backgroundColor: colors.lcdBg,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.lcdBorder,
    borderBottomWidth: 4,
    borderBottomColor: colors.lcdBgDark,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  lcdText: { fontFamily: fonts.mono, color: colors.lcdText },
  lcdTextDim: { fontFamily: fonts.mono, color: colors.lcdTextDim },

  // Chips
  chip: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 3, borderWidth: 1, borderColor: colors.border },
  chipSelf: { color: colors.keyTextAlt, borderColor: colors.keyTextAlt },
  chipActive: { color: colors.success, borderColor: colors.success },
  chipEliminated: { color: colors.textMuted, borderColor: colors.textMuted },
  chipEmpty: { color: colors.textMuted, borderColor: colors.textMuted, borderStyle: 'dashed' },

  // Botones
  btn: { backgroundColor: colors.keyOk, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 4, borderBottomWidth: 4, borderBottomColor: colors.keyOkShadow },
  btnSecondary: { backgroundColor: colors.keyBgAlt, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 4, borderBottomWidth: 4, borderBottomColor: colors.keyShadow },
  btnText: { color: colors.keyText, fontFamily: fonts.bodyBold, fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },

  // NumPad — teclas físicas de calculadora
  padGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 256, gap: 8, justifyContent: 'center' },
  padKey: { width: 80, height: 64, backgroundColor: colors.keyBg, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.keyBgAlt, borderBottomWidth: 5, borderBottomColor: colors.keyShadow },
  padKeyOk: { backgroundColor: colors.keyOk, borderBottomColor: colors.keyOkShadow, borderColor: colors.keyOk },
  padKeyText: { color: colors.keyText, fontFamily: fonts.mono, fontSize: 24 },
  padKeyOkText: { color: colors.keyText, fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 1 },
  padDisabled: { opacity: 0.3 },

  // Barra de progreso
  progressBar: { height: 3, backgroundColor: colors.success, borderRadius: 0 },

  // Header de marca — compartido entre todas las pantallas
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 14, alignItems: 'center' },
  brandModel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.7 },
  brandSub: { fontFamily: fonts.bodyMedium, fontSize: 9, color: colors.textMuted, letterSpacing: 2, opacity: 0.5 },
});

import React, { useState, useEffect } from 'react';
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
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { login, clearError } from '../../store/slices/authSlice';
import { Colors } from '../../constants/Colors';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (error) {
      Alert.alert('Login Failed', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error]);

  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  function validate(): boolean {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Security key is required');
      valid = false;
    }

    return valid;
  }

  function handleLogin() {
    if (!validate()) return;
    dispatch(login({ email: email.trim(), password }));
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Access your editorial vault</Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWrap, emailError ? styles.inputError : null]}>
              <TextInput
                style={styles.input}
                placeholder="name@institution.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(''); }}
              />
            </View>
            {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>SECURITY KEY</Text>
              <TouchableOpacity>
                <Text style={styles.forgotLink}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputWrap, passwordError ? styles.inputError : null]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.loginBtnContent}>
                <Text style={styles.loginBtnText}>Enter The Vault</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Register */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New to the ecosystem? </Text>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Request Access</Text>
            </TouchableOpacity>
          </View>

          {/* Security Badges */}
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.badgeText}>AES-256</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.badgeText}>SIPC PROTECTED</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>© 2024 SOUKPAY INSTITUTIONAL. ALL RIGHTS RESERVED.</Text>
        <View style={styles.footerLinks}>
          {['PRIVACY', 'COMPLIANCE', 'SUPPORT'].map((l) => (
            <TouchableOpacity key={l}>
              <Text style={styles.footerLink}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF0F7' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.navy, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 32 },

  fieldGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.8 },
  forgotLink: { fontSize: 13, fontWeight: '600', color: Colors.navy },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: { borderColor: Colors.error },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  eyeBtn: { paddingLeft: 8 },
  fieldError: { color: Colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 },

  loginBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 100,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  registerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  registerText: { color: Colors.textSecondary, fontSize: 14 },
  registerLink: { color: Colors.navy, fontWeight: '700', fontSize: 14 },

  badges: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeText: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5 },

  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 10, marginTop: 32, marginBottom: 8 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 16 },
  footerLink: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
});

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logDebugError } from '../services/errorLogger';
import { DiagnosticsModal } from './modals/DiagnosticsModal';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDiagnostics: boolean;
  showStack: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDiagnostics: false,
    showStack: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      showDiagnostics: false,
      showStack: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[App Crash Caught by ErrorBoundary]:', error, errorInfo);
    logDebugError(
      'REACT_ERROR_BOUNDARY',
      error?.message || 'React Error Boundary',
      error?.stack,
      { componentStack: errorInfo?.componentStack }
    ).catch(() => {});
  }

  private handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleShareError = async () => {
    try {
      if (this.state.error) {
        await Share.share({
          title: 'AAMS Crash Report',
          message: `AAMS App Error:\n${this.state.error.message}\n\nStack:\n${this.state.error.stack || ''}`,
        });
      }
    } catch {}
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={44} color="#f97316" />
              </View>

              <Text style={styles.title}>تم حماية التطبيق من الإغلاق</Text>
              <Text style={styles.message}>
                رصد النظام خطأ غير متوقع وقام بمنع انهيار التطبيق. يمكنك الاطلاع على سبب الخطأ أدناه وإعادة المحاولة بأمان.
              </Text>

              {/* Error Detail Box */}
              <View style={styles.errorBox}>
                <View style={styles.errorHeader}>
                  <Ionicons name="warning-outline" size={16} color="#ef4444" />
                  <Text style={styles.errorLabel}>سبب الخطأ المسجل:</Text>
                </View>
                <Text style={styles.errorMsg} numberOfLines={3}>
                  {this.state.error?.message || 'Unknown exception'}
                </Text>

                {this.state.showStack && this.state.error?.stack && (
                  <ScrollView style={styles.stackBox} nestedScrollEnabled>
                    <Text style={styles.stackText}>{this.state.error.stack}</Text>
                  </ScrollView>
                )}

                <TouchableOpacity
                  style={styles.toggleStackBtn}
                  onPress={() => this.setState((prev) => ({ showStack: !prev.showStack }))}
                >
                  <Text style={styles.toggleStackText}>
                    {this.state.showStack ? 'إخفاء المسار الفني (Stack)' : 'عرض المسار الفني والـ Stack'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Main Actions */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleRestart}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginHorizontal: 6 }} />
                <Text style={styles.buttonText}>إعادة المحاولة والمتابعة</Text>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => this.setState({ showDiagnostics: true })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bug-outline" size={16} color="#f97316" style={{ marginHorizontal: 4 }} />
                  <Text style={styles.secondaryButtonText}>سجل الأخطاء الكامل</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={this.handleShareError}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={16} color="#38bdf8" style={{ marginHorizontal: 4 }} />
                  <Text style={[styles.secondaryButtonText, { color: '#38bdf8' }]}>مشاركة التقرير</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <DiagnosticsModal
            visible={this.state.showDiagnostics}
            colors={{
              bg: '#0f172a',
              card: '#1e293b',
              cardHeader: '#334155',
              textPrimary: '#ffffff',
              textSecondary: '#94a3b8',
              border: '#334155',
              primary: '#f97316',
              primaryLight: 'rgba(249, 115, 22, 0.16)',
              primaryText: '#fb923c',
              accent: '#38bdf8',
              accentLight: 'rgba(56, 189, 248, 0.16)',
              inputBg: '#0f172a',
              inputBorder: '#334155',
              warningBg: 'rgba(234, 179, 8, 0.15)',
              warningBorder: 'rgba(234, 179, 8, 0.3)',
              warningText: '#fef08a',
              errorBg: 'rgba(239, 68, 68, 0.15)',
              errorText: '#fca5a5',
            }}
            isDarkMode={true}
            isRTL={true}
            onClose={() => this.setState({ showDiagnostics: false })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#151c2e',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#243049',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#0b0f19',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ef444430',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  errorLabel: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '700',
  },
  errorMsg: {
    fontSize: 13,
    color: '#f87171',
    fontWeight: '600',
    lineHeight: 18,
  },
  stackBox: {
    maxHeight: 150,
    backgroundColor: '#030712',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  stackText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  toggleStackBtn: {
    marginTop: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  toggleStackText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    marginBottom: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '700',
  },
});

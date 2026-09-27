import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logDebugError } from '../services/errorLogger';

interface Props {
  children: ReactNode;
  moduleName?: string;
  onReset?: () => void;
  fallback?: ReactNode;
  colors?: {
    bg?: string;
    card?: string;
    textPrimary?: string;
    textSecondary?: string;
    border?: string;
    primary?: string;
    errorBg?: string;
    errorText?: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const moduleName = this.props.moduleName || 'GeneralModule';
    console.error(`[ModuleErrorBoundary Caught in ${moduleName}]:`, error, errorInfo);
    logDebugError(
      'REACT_ERROR_BOUNDARY',
      `[${moduleName}] ${error?.message || 'Error in module'}`,
      error?.stack,
      {
        module: moduleName,
        componentStack: errorInfo?.componentStack,
      }
    ).catch(() => {});
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.log('Error executing module onReset callback:', e);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const moduleName = this.props.moduleName || 'هذا القسم';
      const cardBg = this.props.colors?.card || '#16161a';
      const textPrimary = this.props.colors?.textPrimary || '#ffffff';
      const textSecondary = this.props.colors?.textSecondary || '#9ca3af';
      const borderColor = this.props.colors?.border || '#27272e';
      const primaryColor = this.props.colors?.primary || '#f97316';

      return (
        <View style={[styles.moduleCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-alert-outline" size={24} color="#f97316" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: textPrimary }]}>
                توقف مؤقت في {moduleName}
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                باقي أجزاء التطبيق تعمل بشكل طبيعي وآمن
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: textSecondary }]}>
            حدث استثناء غير متوقع في هذا الجزء فقط. يمكنك إعادة المحاولة لتحديث البيانات واستئناف العمل فوراً.
          </Text>

          {this.state.showDetails && (
            <View style={styles.detailsBox}>
              <Text style={styles.detailsText}>
                {this.state.error?.message || 'Unknown Exception'}
              </Text>
              {this.state.error?.stack ? (
                <ScrollView style={styles.stackScroll} nestedScrollEnabled>
                  <Text style={styles.stackCode}>{this.state.error.stack}</Text>
                </ScrollView>
              ) : null}
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: primaryColor }]}
              onPress={this.handleRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.detailsBtn, { borderColor }]}
              onPress={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              activeOpacity={0.7}
            >
              <Text style={[styles.detailsBtnText, { color: textSecondary }]}>
                {this.state.showDetails ? 'إخفاء التفاصيل' : 'تفاصيل الخطأ'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  moduleCard: {
    margin: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
    marginBottom: 14,
  },
  detailsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailsText: {
    fontSize: 11,
    color: '#ef4444',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  stackScroll: {
    maxHeight: 120,
  },
  stackCode: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  retryBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnIcon: {
    marginLeft: 6,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  detailsBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailsBtnText: {
    fontSize: 12,
  },
});

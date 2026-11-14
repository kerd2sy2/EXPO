import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ModuleErrorBoundaryProps {
  children: ReactNode;
  moduleName?: string;
  onReset?: () => void;
  fallback?: ReactNode;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  public state: ModuleErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown module error',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const moduleName = this.props.moduleName || 'GeneralModule';
    console.warn(`[ModuleErrorBoundary: ${moduleName}]`, error?.message, errorInfo?.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn('[ModuleErrorBoundary] Reset callback error:', e);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const moduleName = this.props.moduleName || 'هذا القسم';
      return (
        <View style={styles.moduleCard}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#0284c7" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>توقف مؤقت في {moduleName}</Text>
              <Text style={styles.subtitle}>باقي أجزاء التطبيق تعمل بشكل طبيعي وآمن</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#ffffff" />
            <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
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
    borderColor: '#27272e',
    backgroundColor: '#16161a',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'right',
  },
  retryBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

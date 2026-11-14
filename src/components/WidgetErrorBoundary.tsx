import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetName?: string;
  onRetry?: () => void;
  fallback?: ReactNode;
  compact?: boolean;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  public state: WidgetErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown widget error',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const label = this.props.widgetName || 'Widget';
    console.warn(`[WidgetErrorBoundary: ${label}] Isolated error:`, error?.message, errorInfo?.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onRetry) {
      try {
        this.props.onRetry();
      } catch (err) {
        console.warn('[WidgetErrorBoundary] Retry callback error:', err);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const label = this.props.widgetName ? ` (${this.props.widgetName})` : '';
      return (
        <View style={[styles.card, this.props.compact && styles.cardCompact]}>
          <View style={styles.row}>
            <View style={styles.iconBadge}>
              <Ionicons name="alert-circle-outline" size={18} color="#f59e0b" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>تعذر تحميل هذا الجزء مؤقتاً{label}</Text>
              {!this.props.compact && (
                <Text style={styles.subtitle}>باقي عناصر الشاشة تعمل بشكل طبيعي</Text>
              )}
            </View>
            <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.8}>
              <Ionicons name="refresh" size={14} color="#ffffff" />
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
  },
  cardCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f4f4f5',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 11,
    color: '#a1a1aa',
    marginTop: 2,
    textAlign: 'right',
  },
  retryBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});

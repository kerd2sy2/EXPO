import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { ThemeColors } from '../../types/delegate';
import { CustodyDayData, CustodyExpenseItem } from '../../services/custodyService';
import { toArabicDigits, formatArabicNumber } from '../../utils/formatters';
import { matchesExportNumberQuery, normalizeForSearch } from '../../utils/exportNumber';
import { ahdaSearchStyles as styles } from './ahdaSearchStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AhdaSearchBottomSheetProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  days: CustodyDayData[];
  categories: Array<{ key: string; label: string; icon: string; color: string; bg: string }>;
  onClose: () => void;
  onSelectExpense: (expense: CustodyExpenseItem, day: CustodyDayData) => void;
}

export const AhdaSearchBottomSheet: React.FC<AhdaSearchBottomSheetProps> = ({
  visible,
  colors,
  isDarkMode,
  days,
  categories,
  onClose,
  onSelectExpense,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          bounciness: 3,
          speed: 14,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setQuery('');
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      setQuery('');
    });
  };

  // Filter expenses across all days based on query
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const normalizedQuery = normalizeForSearch(q);

    const matches: Array<{ day: CustodyDayData; expense: CustodyExpenseItem }> = [];

    for (const day of days) {
      if (Array.isArray(day.expenses)) {
        for (const exp of day.expenses) {
          // 1. Matches incoming/export sequence number
          const matchesNum = matchesExportNumberQuery(q, exp.export_number);

          // 2. Matches recipient name
          const normRecipient = normalizeForSearch(exp.recipient_name || '');
          const matchesRecipient = normRecipient.includes(normalizedQuery);

          // 3. Matches notes/statement if present
          const extraText = (exp as any).notes || (exp as any).statement || '';
          const normNotes = normalizeForSearch(extraText);
          const matchesNotes = normNotes.includes(normalizedQuery);

          // 4. Matches category label
          const cat = categories.find((c) => c.key === exp.category);
          const matchesCategory = cat && normalizeForSearch(cat.label).includes(normalizedQuery);

          if (matchesNum || matchesRecipient || matchesNotes || matchesCategory) {
            matches.push({ day, expense: exp });
          }
        }
      }
    }

    return matches;
  }, [query, days, categories]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop (dismiss on tap outside) */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleDismiss}
          />
        </Animated.View>

        {/* Bottom Sheet Box */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' },
              ]}
            />
          </View>

          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              البحث في فواتير الوارد
            </Text>
            <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
              ابحث برقم الوارد، البيان، أو الفئة
            </Text>
          </View>

          {/* Search Input Bar */}
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                borderColor: query.trim() ? '#059669' : colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={query.trim() ? '#059669' : colors.textSecondary}
              style={{ marginLeft: 8 }}
            />
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.textPrimary }]}
              placeholder="بحث برقم الوارد (مثال: 1/أ) أو البيان..."
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {query.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results Count Header if query active */}
          {query.trim().length > 0 && (
            <View style={styles.countRow}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Ionicons name="barcode-outline" size={15} color="#047857" />
                <Text style={[styles.countText, { color: colors.textPrimary }]}>
                  نتائج البحث ({toArabicDigits(searchResults.length)})
                </Text>
              </View>
            </View>
          )}

          {/* Results Scroll List */}
          <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {query.trim().length === 0 ? (
              <View style={styles.hintContainer}>
                <View
                  style={[
                    styles.hintIconCircle,
                    { backgroundColor: isDarkMode ? '#1e293b' : '#ecfdf5' },
                  ]}
                >
                  <Ionicons name="search" size={28} color="#047857" />
                </View>
                <Text style={[styles.hintTitle, { color: colors.textPrimary }]}>
                  البحث السريع في الوارد
                </Text>
                <Text style={[styles.hintSub, { color: colors.textSecondary }]}>
                  اكتب رقم الوارد مثل (1/أ أو 2) أو البيان للعثور على الفاتورة فوراً.
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.emptyContainer}>
                <LottieView
                  source={require('../../../assets/Lottie/json/empty_invoices.json')}
                  autoPlay
                  loop
                  style={{ width: 130, height: 130 }}
                />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  لم يتم العثور على نتائج
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  لا توجد فواتير مطابقة لـ "{query}" في سجلات العهدة.
                </Text>
              </View>
            ) : (
              searchResults.map((item, idx) => {
                const cat =
                  categories.find((c) => c.key === item.expense.category) ||
                  categories[categories.length - 1];

                return (
                  <TouchableOpacity
                    key={item.expense.id || idx}
                    style={[
                      styles.resultCard,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      handleDismiss();
                      setTimeout(() => {
                        onSelectExpense(item.expense, item.day);
                      }, 220);
                    }}
                  >
                    {/* Top Row: Category + Export Badge + Date */}
                    <View style={styles.cardTopRow}>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                          <Ionicons name={cat.icon as any} size={12} color={cat.color} />
                        </View>
                        <Text style={[styles.catLabel, { color: colors.textPrimary }]}>
                          {cat.label}
                        </Text>
                        {item.expense.export_number ? (
                          <View style={styles.exportBadge}>
                            <Ionicons name="barcode-outline" size={11} color="#047857" />
                            <Text style={styles.exportBadgeText}>
                              وارد: {item.expense.export_number}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                          {toArabicDigits(item.day.date)}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Row: Recipient/Notes + Amount */}
                    <View style={styles.cardBottomRow}>
                      <Text
                        style={[styles.recipientText, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.expense.recipient_name || (item.expense as any).statement || 'بدون بيان'}
                      </Text>

                      <View style={styles.amountGroup}>
                        <Text style={styles.amountVal}>
                          {formatArabicNumber(item.expense.amount, 2)}
                        </Text>
                        <Text style={[styles.currText, { color: colors.textSecondary }]}>
                          ر.س
                        </Text>
                        <Ionicons
                          name="chevron-back"
                          size={14}
                          color="#047857"
                          style={{ marginRight: 4 }}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

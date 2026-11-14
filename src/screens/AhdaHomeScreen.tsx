import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../types/delegate';
import { AhdaHeader } from '../components/AhdaHeader';
import { AhdaProfileScreen } from './AhdaProfileScreen';
import { AhdaDayExpensesScreen } from './AhdaDayExpensesScreen';
import { AhdaNetCustodyCard } from '../components/AhdaNetCustodyCard';
import { AhdaCategoryGrid } from '../components/AhdaCategoryGrid';
import { AhdaDayExpensesSummaryCard } from '../components/AhdaDayExpensesSummaryCard';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import {
  AhdaNetCustodyCardSkeleton,
  AhdaCategoryGridSkeleton,
  AhdaDayExpensesSummaryCardSkeleton,
} from '../components/skeleton/AhdaHomeSkeleton';
import { CATEGORIES, ahdaHomeStyles as styles } from './ahda-home/ahdaHomeHelpers';
import { useAhdaBranchAndDate } from './ahda-home/useAhdaBranchAndDate';
import { useAhdaCustodyState } from './ahda-home/useAhdaCustodyState';
import { useAhdaCustodyMutations } from './ahda-home/useAhdaCustodyMutations';
import { AhdaHomeModalsSection } from './ahda-home/AhdaHomeModalsSection';

interface AhdaHomeScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  currentUser: any;
  onLogout: () => void;
  onToggleTheme: () => void;
  themePreference?: 'system' | 'light' | 'dark';
  onSelectThemePreference?: (pref: 'system' | 'light' | 'dark') => void;
  onUpdateUser?: (updated: any) => void;
  initialAction?: string;
}

export const AhdaHomeScreen: React.FC<AhdaHomeScreenProps> = ({
  colors,
  isDarkMode,
  currentUser,
  onLogout,
  onToggleTheme,
  themePreference,
  onSelectThemePreference,
  onUpdateUser,
  initialAction,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? 24 : 0);

  const branchAndDate = useAhdaBranchAndDate(currentUser);
  const state = useAhdaCustodyState({
    currentUser,
    onUpdateUser,
    initialAction,
    branchAndDate,
  });

  const mutations = useAhdaCustodyMutations({
    currentUser,
    onUpdateUser,
    selectedDate: branchAndDate.selectedDate,
    updateSelectedDate: branchAndDate.updateSelectedDate,
    activeBranch: branchAndDate.activeBranch,
    days: state.days,
    setDays: state.setDays,
    dayLogs: state.dayLogs,
    currentDay: state.currentDay,
    effectiveOpeningBalance: state.effectiveOpeningBalance,
    activeStoredLedger: state.activeStoredLedger,
    setActiveStoredLedger: state.setActiveStoredLedger,
    loadCustodyData: state.loadCustodyData,
    canAddCustody: state.canAddCustody,
    canAddExpense: state.canAddExpense,
    canDeleteCustody: state.canDeleteCustody,
    addCustodyAmount: state.addCustodyAmount,
    setAddCustodyAmount: state.setAddCustodyAmount,
    setShowAddCustodyModal: state.setShowAddCustodyModal,
    setAddCustodyLoading: state.setAddCustodyLoading,
    setAlertConfig: state.setAlertConfig,
    selectedCategory: state.selectedCategory,
    expenseAmount: state.expenseAmount,
    setExpenseAmount: state.setExpenseAmount,
    expenseRecipient: state.expenseRecipient,
    setExpenseRecipient: state.setExpenseRecipient,
    exportNumber: state.exportNumber,
    setExportNumber: state.setExportNumber,
    invoiceImageUri: state.invoiceImageUri,
    setInvoiceImageUri: state.setInvoiceImageUri,
    setShowAddExpenseModal: state.setShowAddExpenseModal,
    setAddExpenseLoading: state.setAddExpenseLoading,
    editingExpense: state.editingExpense,
    setEditingExpense: state.setEditingExpense,
    editCategory: state.editCategory,
    setEditCategory: state.setEditCategory,
    editAmount: state.editAmount,
    setEditAmount: state.setEditAmount,
    editRecipient: state.editRecipient,
    setEditRecipient: state.setEditRecipient,
    editExportNumber: state.editExportNumber,
    setEditExportNumber: state.setEditExportNumber,
    editImageUri: state.editImageUri,
    setEditImageUri: state.setEditImageUri,
    editDate: state.editDate,
    setEditDate: state.setEditDate,
    setEditLoading: state.setEditLoading,
    setExportingExcel: state.setExportingExcel,
  });

  const handlePressProfile = useCallback(() => state.setShowProfile(true), [state]);
  const handlePressSearch = useCallback(() => state.setShowSearchModal(true), [state]);

  return (
    <SafeAreaView
      edges={state.showProfile || state.showDayExpensesPage ? ['left', 'right'] : ['top', 'bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {state.showProfile ? (
        <View style={{ flex: 1, marginTop: topInset }}>
          <ModuleErrorBoundary moduleName="AhdaProfileScreen" onReset={() => state.setShowProfile(false)}>
            <AhdaProfileScreen
              currentUser={currentUser}
              colors={colors}
              isDarkMode={isDarkMode}
              onBack={() => state.setShowProfile(false)}
              onLogout={onLogout}
              onToggleTheme={onToggleTheme}
              themePreference={themePreference}
              onSelectThemePreference={onSelectThemePreference}
              onUpdateUser={onUpdateUser}
            />
          </ModuleErrorBoundary>
        </View>
      ) : state.showDayExpensesPage ? (
        <View style={{ flex: 1, marginTop: topInset }}>
          <ModuleErrorBoundary moduleName="AhdaDayExpensesScreen" onReset={state.handleCloseDayExpenses}>
            <AhdaDayExpensesScreen
              currentDay={state.currentDay}
              selectedDate={branchAndDate.selectedDate}
              categoryFilter={state.selectedCategoryFilter}
              loading={state.loading}
              colors={colors}
              isDarkMode={isDarkMode}
              categories={CATEGORIES}
              dayLogs={state.dayLogs}
              currentUser={currentUser}
              onBack={state.handleCloseDayExpenses}
              onOpenAddExpense={() => state.handleOpenAddExpenseFast(state.selectedCategoryFilter)}
              onEditExpense={mutations.handleOpenEditExpense}
              onDeleteExpense={mutations.handleDeleteExpense}
              onPreviewImage={(url) => state.setPreviewImage(url)}
              onReorderExpenses={mutations.handleReorderExpenses}
              initialExpenseDetails={state.initialExpenseForDetails}
              onClearInitialExpenseDetails={() => state.setInitialExpenseForDetails(null)}
            />
          </ModuleErrorBoundary>
        </View>
      ) : (
        <>
          <View style={styles.fixedHeaderWrap}>
            <ModuleErrorBoundary moduleName="AhdaHeader">
              <AhdaHeader
                user={currentUser}
                colors={colors}
                isDarkMode={isDarkMode}
                activeBranchName={branchAndDate.activeBranch.name}
                canSwitchBranch={branchAndDate.canSwitchBranch}
                onPressProfile={handlePressProfile}
                onPressSearch={handlePressSearch}
                onPressBranchSelector={branchAndDate.handlePressBranchSelector}
                onPressDatePicker={branchAndDate.handlePressDatePicker}
                onResetToToday={branchAndDate.handleResetToToday}
              />
            </ModuleErrorBoundary>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={true}
            overScrollMode="always"
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: 8,
                paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
                flexGrow: 1,
                justifyContent: 'space-evenly',
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={state.onRefresh}
                colors={['#047857']}
                tintColor="#047857"
                progressBackgroundColor={colors.card}
              />
            }
          >
            {state.loading ? (
              <>
                <AhdaNetCustodyCardSkeleton colors={colors} isDarkMode={isDarkMode} />
                <AhdaCategoryGridSkeleton colors={colors} isDarkMode={isDarkMode} />
                <AhdaDayExpensesSummaryCardSkeleton colors={colors} isDarkMode={isDarkMode} />
              </>
            ) : (
              <>
                <ModuleErrorBoundary moduleName="AhdaNetCustodyCard">
                  <AhdaNetCustodyCard
                    currentDay={state.currentDay}
                    effectiveOpeningBalance={state.effectiveOpeningBalance}
                    custodyAddedLogs={state.custodyAddedLogs}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    selectedDate={branchAndDate.selectedDate}
                    onPressCard={state.handleOpenAddCustodyFast}
                    onPressManageLogs={() => state.setShowLogsSheet(true)}
                    onSwipePrevDay={() => branchAndDate.changeDateByDays(-1)}
                    onSwipeNextDay={() => branchAndDate.changeDateByDays(1)}
                    onPressDatePicker={branchAndDate.handlePressDatePicker}
                    onResetToToday={branchAndDate.handleResetToToday}
                  />
                </ModuleErrorBoundary>

                <ModuleErrorBoundary moduleName="AhdaCategoryGrid">
                  <AhdaCategoryGrid
                    categories={CATEGORIES}
                    currentDay={state.currentDay}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    onSelectCategory={(catKey) => state.handleOpenAddExpenseFast(catKey)}
                    onLongPressCategory={(catKey) => {
                      state.setInitialExpenseForDetails(null);
                      state.setSelectedCategoryFilter(catKey);
                      state.setShowDayExpensesPage(true);
                    }}
                  />
                </ModuleErrorBoundary>

                <ModuleErrorBoundary moduleName="AhdaDayExpensesSummaryCard">
                  <AhdaDayExpensesSummaryCard
                    currentDay={state.currentDay}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    loadingPdf={state.exportingExcel}
                    onPress={() => {
                      state.setInitialExpenseForDetails(null);
                      state.setSelectedCategoryFilter(null);
                      state.setShowDayExpensesPage(true);
                    }}
                    onPressPdf={async () => {
                      const expensesCount = state.currentDay?.expenses?.length || 0;
                      if (expensesCount === 0) {
                        state.setShowNoInvoicesNoticeModal(true);
                      } else {
                        await mutations.handleExportPdf('share');
                      }
                    }}
                    onLongPressPdf={() => {
                      const expensesCount = state.currentDay?.expenses?.length || 0;
                      if (expensesCount === 0) {
                        state.setShowNoInvoicesNoticeModal(true);
                      } else {
                        state.setShowReportPreviewModal(true);
                      }
                    }}
                  />
                </ModuleErrorBoundary>
              </>
            )}
          </ScrollView>
        </>
      )}

      <AhdaHomeModalsSection
        colors={colors}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
        branchAndDate={branchAndDate}
        state={state}
        mutations={mutations}
      />
    </SafeAreaView>
  );
};

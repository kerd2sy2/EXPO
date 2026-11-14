import React from 'react';
import { ThemeColors } from '../../types/delegate';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { AhdaActionAlertModal } from '../../components/modals/AhdaActionAlertModal';
import { AhdaAddExpenseModal } from '../../components/modals/AhdaAddExpenseModal';
import { AhdaEditExpenseModal } from '../../components/modals/AhdaEditExpenseModal';
import { AhdaAddCustodyModal } from '../../components/modals/AhdaAddCustodyModal';
import { AhdaCustodyLogsModal } from '../../components/modals/AhdaCustodyLogsModal';
import { AhdaDatePickerModal } from '../../components/modals/AhdaDatePickerModal';
import { AhdaImageViewerModal } from '../../components/modals/AhdaImageViewerModal';
import { AhdaReportPreviewModal } from '../../components/modals/AhdaReportPreviewModal';
import { AhdaSharedImageCategoryModal } from '../../components/modals/AhdaSharedImageCategoryModal';
import { AhdaQuickCategoryModal } from '../../components/modals/AhdaQuickCategoryModal';
import { AhdaBranchSelectorModal } from '../../components/modals/AhdaBranchSelectorModal';
import { AhdaSearchBottomSheet } from '../../components/modals/AhdaSearchBottomSheet';
import { AhdaNoInvoicesAutoModal } from '../../components/modals/AhdaNoInvoicesAutoModal';
import { calculateNextExportNumber } from '../../utils/exportNumber';
import { CATEGORIES } from './ahdaHomeHelpers';

interface AhdaHomeModalsSectionProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  currentUser: any;
  branchAndDate: any;
  state: any;
  mutations: any;
}

export const AhdaHomeModalsSection: React.FC<AhdaHomeModalsSectionProps> = ({
  colors,
  isDarkMode,
  currentUser,
  branchAndDate,
  state,
  mutations,
}) => {
  const {
    selectedDate,
    searchReturnDateRef,
    updateSelectedDate,
    showDatePickerModal,
    setShowDatePickerModal,
    pickerYear,
    setPickerYear,
    pickerMonth,
    setPickerMonth,
    branches,
    activeBranch,
    canSwitchBranch,
    showBranchModal,
    setShowBranchModal,
    mustSelectBranch,
  } = branchAndDate;

  return (
    <>
      {state.showAddExpenseModal && (
        <ModuleErrorBoundary moduleName="AhdaAddExpenseModal" onReset={() => state.setShowAddExpenseModal(false)}>
          <AhdaAddExpenseModal
            visible={state.showAddExpenseModal}
            colors={colors}
            isDarkMode={isDarkMode}
            categories={CATEGORIES}
            selectedCategory={state.selectedCategory}
            expenseAmount={state.expenseAmount}
            setExpenseAmount={state.setExpenseAmount}
            expenseRecipient={state.expenseRecipient}
            setExpenseRecipient={state.setExpenseRecipient}
            exportNumber={state.exportNumber}
            setExportNumber={state.setExportNumber}
            invoiceImageUri={state.invoiceImageUri}
            setInvoiceImageUri={state.setInvoiceImageUri}
            loading={state.addExpenseLoading}
            onPickImage={mutations.handlePickImage}
            onSave={mutations.handleSaveExpense}
            onClose={() => state.setShowAddExpenseModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {!!state.editingExpense && (
        <ModuleErrorBoundary moduleName="AhdaEditExpenseModal" onReset={() => state.setEditingExpense(null)}>
          <AhdaEditExpenseModal
            visible={!!state.editingExpense}
            colors={colors}
            isDarkMode={isDarkMode}
            categories={CATEGORIES}
            editCategory={state.editCategory}
            setEditCategory={(newCat) => {
              state.setEditCategory(newCat);
              if ((newCat === 'internet_advance' || newCat === 'advance') && !state.editExportNumber.trim()) {
                state.setEditExportNumber(calculateNextExportNumber(state.days));
              }
            }}
            editAmount={state.editAmount}
            setEditAmount={state.setEditAmount}
            editRecipient={state.editRecipient}
            setEditRecipient={state.setEditRecipient}
            editDate={state.editDate}
            setEditDate={state.setEditDate}
            days={state.days}
            editExportNumber={state.editExportNumber}
            setEditExportNumber={state.setEditExportNumber}
            editImageUri={state.editImageUri}
            setEditImageUri={state.setEditImageUri}
            onPickImage={mutations.handlePickEditImage}
            loading={state.editLoading}
            onSave={mutations.handleSaveEditExpense}
            onDelete={() => {
              const item = state.editingExpense;
              if (item) {
                state.setEditingExpense(null);
                mutations.handleDeleteExpense(item);
              }
            }}
            onClose={() => state.setEditingExpense(null)}
          />
        </ModuleErrorBoundary>
      )}

      {state.showAddCustodyModal && (
        <ModuleErrorBoundary moduleName="AhdaAddCustodyModal" onReset={() => state.setShowAddCustodyModal(false)}>
          <AhdaAddCustodyModal
            visible={state.showAddCustodyModal}
            colors={colors}
            selectedDate={selectedDate}
            custodyTotalAvailable={state.custodyTotalAvailable}
            addCustodyAmount={state.addCustodyAmount}
            setAddCustodyAmount={state.setAddCustodyAmount}
            loading={state.addCustodyLoading}
            onSave={mutations.handleSaveCustodyAmount}
            onClose={() => state.setShowAddCustodyModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {state.showLogsSheet && (
        <ModuleErrorBoundary moduleName="AhdaCustodyLogsModal" onReset={() => state.setShowLogsSheet(false)}>
          <AhdaCustodyLogsModal
            visible={state.showLogsSheet}
            colors={colors}
            logs={state.custodyAddedLogs}
            onDeleteLog={mutations.handleDeleteCustodyEntry}
            onClose={() => state.setShowLogsSheet(false)}
          />
        </ModuleErrorBoundary>
      )}

      {showDatePickerModal && (
        <ModuleErrorBoundary moduleName="AhdaDatePickerModal" onReset={() => setShowDatePickerModal(false)}>
          <AhdaDatePickerModal
            visible={showDatePickerModal}
            colors={colors}
            isDarkMode={isDarkMode}
            selectedDate={selectedDate}
            pickerYear={pickerYear}
            setPickerYear={setPickerYear}
            pickerMonth={pickerMonth}
            setPickerMonth={setPickerMonth}
            days={state.days}
            onSelectDate={(newDate) => {
              updateSelectedDate(newDate);
              setShowDatePickerModal(false);
            }}
            onClose={() => setShowDatePickerModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {!!state.previewImage && (
        <ModuleErrorBoundary moduleName="AhdaImageViewerModal" onReset={() => state.setPreviewImage(null)}>
          <AhdaImageViewerModal
            visible={!!state.previewImage}
            imageUrl={state.previewImage}
            onClose={() => state.setPreviewImage(null)}
          />
        </ModuleErrorBoundary>
      )}

      {state.showNoInvoicesNoticeModal && (
        <ModuleErrorBoundary moduleName="AhdaNoInvoicesAutoModal" onReset={() => state.setShowNoInvoicesNoticeModal(false)}>
          <AhdaNoInvoicesAutoModal
            visible={state.showNoInvoicesNoticeModal}
            colors={colors}
            isDarkMode={isDarkMode}
            onClose={() => state.setShowNoInvoicesNoticeModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {state.showReportPreviewModal && (
        <ModuleErrorBoundary moduleName="AhdaReportPreviewModal" onReset={() => state.setShowReportPreviewModal(false)}>
          <AhdaReportPreviewModal
            visible={state.showReportPreviewModal}
            currentDay={
              state.currentDay
                ? { ...state.currentDay, ledger_image_url: state.activeStoredLedger || state.currentDay.ledger_image_url }
                : null
            }
            selectedDate={selectedDate}
            currentUser={currentUser}
            dayLogs={state.dayLogs}
            effectiveOpeningBalance={state.effectiveOpeningBalance}
            colors={colors}
            isDarkMode={isDarkMode}
            loading={state.exportingExcel}
            onClose={() => state.setShowReportPreviewModal(false)}
            onExportAndShare={async () => {
              await mutations.handleExportPdf('share');
            }}
            onPreviewImage={(url) => state.setPreviewImage(url)}
            onUpdateLedgerImage={mutations.handleSaveLedgerImage}
          />
        </ModuleErrorBoundary>
      )}

      {!!state.sharedImagePending && (
        <ModuleErrorBoundary moduleName="AhdaSharedImageCategoryModal" onReset={() => state.setSharedImagePending(null)}>
          <AhdaSharedImageCategoryModal
            visible={!!state.sharedImagePending}
            imageUri={state.sharedImagePending}
            categories={CATEGORIES}
            colors={colors}
            isDarkMode={isDarkMode}
            onSelectLedger={() => {
              const uri = state.sharedImagePending;
              state.setSharedImagePending(null);
              if (uri) mutations.handleSaveLedgerImage(uri);
            }}
            onSelectCategory={(catKey) => {
              state.syncUserProfileBackground();
              if (!state.canAddExpense) {
                state.setAlertConfig({
                  type: 'warning',
                  title: 'غير مصرح',
                  message: 'ليس لديك صلاحية لتسجيل المصروفات (الصرف).',
                });
                return;
              }
              state.setSelectedCategory(catKey);
              state.setInvoiceImageUri(state.sharedImagePending);
              state.setSharedImagePending(null);
              state.setShowAddExpenseModal(true);
            }}
            onClose={() => state.setSharedImagePending(null)}
          />
        </ModuleErrorBoundary>
      )}

      {state.showQuickCategoryModal && (
        <ModuleErrorBoundary moduleName="AhdaQuickCategoryModal" onReset={() => state.setShowQuickCategoryModal(false)}>
          <AhdaQuickCategoryModal
            visible={state.showQuickCategoryModal}
            categories={CATEGORIES}
            colors={colors}
            isDarkMode={isDarkMode}
            onSelectCategory={(catKey) => {
              state.setShowQuickCategoryModal(false);
              state.handleOpenAddExpenseFast(catKey);
            }}
            onClose={() => state.setShowQuickCategoryModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {!!state.alertConfig && (
        <ModuleErrorBoundary moduleName="AhdaActionAlertModal" onReset={() => state.setAlertConfig(null)}>
          <AhdaActionAlertModal
            config={state.alertConfig}
            colors={colors}
            isDarkMode={isDarkMode}
            onClose={() => state.setAlertConfig(null)}
          />
        </ModuleErrorBoundary>
      )}

      {canSwitchBranch && showBranchModal && (
        <ModuleErrorBoundary moduleName="AhdaBranchSelectorModal" onReset={() => setShowBranchModal(false)}>
          <AhdaBranchSelectorModal
            visible={showBranchModal}
            colors={colors}
            isDarkMode={isDarkMode}
            branches={branches}
            selectedBranchId={activeBranch?.id || null}
            mustSelect={mustSelectBranch}
            onSelectBranch={state.handleSelectBranch}
            onClose={() => {
              if (!mustSelectBranch) setShowBranchModal(false);
            }}
          />
        </ModuleErrorBoundary>
      )}

      {state.showSearchModal && (
        <ModuleErrorBoundary moduleName="AhdaSearchBottomSheet" onReset={() => state.setShowSearchModal(false)}>
          <AhdaSearchBottomSheet
            visible={state.showSearchModal}
            colors={colors}
            isDarkMode={isDarkMode}
            days={state.days}
            categories={CATEGORIES}
            onClose={() => state.setShowSearchModal(false)}
            onSelectExpense={(exp, day) => {
              if (day.date !== selectedDate) {
                searchReturnDateRef.current = selectedDate;
                updateSelectedDate(day.date);
              }
              state.setSelectedCategoryFilter(exp.category);
              state.setInitialExpenseForDetails(exp);
              state.setShowDayExpensesPage(true);
            }}
          />
        </ModuleErrorBoundary>
      )}
    </>
  );
};

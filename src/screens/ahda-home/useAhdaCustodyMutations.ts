import { useCallback } from 'react';
import {
  custodyService,
  CustodyDayData,
  CustodyExpenseItem,
  CustodyLogItem,
} from '../../services/custodyService';
import { formatImageUrl, getActiveBranchId, fetchCurrentUserProfile } from '../../services/api';
import { toArabicDigits, formatArabicNumber } from '../../utils/formatters';
import { calculateNextExportNumber, saveLastUsedExportNumber } from '../../utils/exportNumber';
import { mergeUpdatedCustodyDay } from './ahdaHomeHelpers';
import { useAhdaCustodyMediaActions } from './useAhdaCustodyMediaActions';

export function useAhdaCustodyMutations({
  currentUser,
  onUpdateUser,
  selectedDate,
  updateSelectedDate,
  activeBranch,
  days,
  setDays,
  dayLogs,
  currentDay,
  effectiveOpeningBalance,
  activeStoredLedger,
  setActiveStoredLedger,
  loadCustodyData,
  canAddCustody,
  canAddExpense,
  canDeleteCustody,
  addCustodyAmount,
  setAddCustodyAmount,
  setShowAddCustodyModal,
  setAddCustodyLoading,
  setAlertConfig,
  selectedCategory,
  expenseAmount,
  setExpenseAmount,
  expenseRecipient,
  setExpenseRecipient,
  exportNumber,
  setExportNumber,
  invoiceImageUri,
  setInvoiceImageUri,
  setShowAddExpenseModal,
  setAddExpenseLoading,
  editingExpense,
  setEditingExpense,
  editCategory,
  setEditCategory,
  editAmount,
  setEditAmount,
  editRecipient,
  setEditRecipient,
  editExportNumber,
  setEditExportNumber,
  editImageUri,
  setEditImageUri,
  editDate,
  setEditDate,
  setEditLoading,
  setExportingExcel,
}: any) {
  const bId = activeBranch.id || getActiveBranchId() || null;

  const refreshProfileOn403 = useCallback(() => {
    fetchCurrentUserProfile()
      .then((fresh) => {
        if (fresh && onUpdateUser) onUpdateUser(fresh);
      })
      .catch(() => {});
  }, [onUpdateUser]);

  const is403Error = (err: any) =>
    err?.message?.includes('صلاحية') ||
    err?.message?.includes('غير مصرح') ||
    err?.message?.includes('403');

  const mediaActions = useAhdaCustodyMediaActions({
    currentUser,
    selectedDate,
    bId,
    dayLogs,
    currentDay,
    effectiveOpeningBalance,
    activeStoredLedger,
    setActiveStoredLedger,
    setDays,
    setAlertConfig,
    setInvoiceImageUri,
    setEditImageUri,
    setExportingExcel,
  });

  // 1. Add Custody Amount
  const handleSaveCustodyAmount = async () => {
    if (!canAddCustody) {
      setAlertConfig({
        type: 'warning',
        title: 'غير مصرح',
        message: 'ليس لديك صلاحية لإضافة أو تعديل مبلغ العهدة.',
      });
      return;
    }
    const val = parseFloat(addCustodyAmount);
    if (isNaN(val) || val <= 0) {
      setAlertConfig({
        type: 'warning',
        title: 'قيمة غير صالحة',
        message: 'يرجى إدخال مبلغ عهدة صحيح أكبر من الصفر.',
      });
      return;
    }

    try {
      setAddCustodyLoading(true);
      const updatedDay = currentDay?.id
        ? await custodyService.addAmount({
            custody_day_id: currentDay.id,
            added_amount: val,
            branch_id: activeBranch?.id || undefined,
          })
        : await custodyService.createDay({
            date: selectedDate,
            added_amount: val,
            branch_id: activeBranch?.id || undefined,
          });

      setAddCustodyAmount('');
      setShowAddCustodyModal(false);
      setDays((prev: CustodyDayData[]) =>
        mergeUpdatedCustodyDay(prev, updatedDay, bId, activeStoredLedger)
      );
      void loadCustodyData(true, undefined, true);
      setAlertConfig({
        type: 'success',
        title: 'تمت إضافة العهدة بنجاح',
        message: `تمت إضافة مبلغ ${formatArabicNumber(val, 2)} ريال إلى عهدة يوم ${toArabicDigits(selectedDate)} بنجاح.`,
      });
    } catch (err: any) {
      setShowAddCustodyModal(false);
      const denied = is403Error(err);
      setAlertConfig({
        type: denied ? 'warning' : 'error',
        title: denied ? 'غير مصرح' : 'فشل التحديث',
        message: denied
          ? 'ليس لديك صلاحية لإضافة أو تعديل مبلغ العهدة.'
          : err?.message || 'حدث خطأ أثناء إضافة مبلغ العهدة.',
      });
      if (denied) refreshProfileOn403();
    } finally {
      setAddCustodyLoading(false);
    }
  };

  // 2. Delete / Undo an added custody amount from logs
  const handleDeleteCustodyEntry = (log: CustodyLogItem) => {
    if (!canDeleteCustody) {
      setAlertConfig({
        type: 'warning',
        title: 'غير مصرح',
        message: 'ليس لديك صلاحية لحذف مبالغ العهدة.',
      });
      return;
    }
    setAlertConfig({
      type: 'confirm',
      title: 'تأكيد حذف مبلغ العهدة',
      message: `هل أنت متأكد من حذف وإلغاء مبلغ العهدة (${formatArabicNumber(log.amount, 2)} ريال) المضاف لهذا اليوم؟ سيتم إنقاص الرصيد فوراً.`,
      primaryButtonText: 'نعم، حذف المبلغ',
      secondaryButtonText: 'إلغاء',
      onPrimaryPress: async () => {
        try {
          const res = await custodyService.deleteLog(log.id);
          if (res?.data?.id && res?.data?.date) {
            setDays((prev: CustodyDayData[]) =>
              mergeUpdatedCustodyDay(prev, res.data, bId, activeStoredLedger)
            );
          }
          await loadCustodyData(true, undefined, true);
          setAlertConfig({
            type: 'success',
            title: 'تم الحذف بنجاح',
            message: 'تم حذف مبلغ العهدة وإعادة احتساب الرصيد بنجاح.',
          });
        } catch (err: any) {
          const denied = is403Error(err);
          setAlertConfig({
            type: denied ? 'warning' : 'error',
            title: denied ? 'غير مصرح' : 'فشل الحذف',
            message: denied
              ? 'ليس لديك صلاحية لحذف مبالغ العهدة.'
              : err?.message || 'تعذر حذف مبلغ العهدة من السيرفر.',
          });
          if (denied) refreshProfileOn403();
        }
      },
    });
  };

  // 3. Add Expense & Invoice
  const handleSaveExpense = async () => {
    if (!canAddExpense) {
      setAlertConfig({
        type: 'warning',
        title: 'غير مصرح',
        message: 'ليس لديك صلاحية لتسجيل المصروفات (الصرف).',
      });
      return;
    }
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      setAlertConfig({
        type: 'warning',
        title: 'قيمة غير صالحة',
        message: 'يرجى إدخال مبلغ صحيح للفاتورة أكبر من الصفر.',
      });
      return;
    }

    try {
      setAddExpenseLoading(true);
      let targetDayId = currentDay?.id;
      let uploadedUrl = '';

      if (!targetDayId && invoiceImageUri) {
        const [createdDay, url] = await Promise.all([
          custodyService.createDay({
            date: selectedDate,
            added_amount: 0,
            branch_id: activeBranch?.id || undefined,
          }),
          custodyService.uploadInvoiceImage(invoiceImageUri),
        ]);
        targetDayId = createdDay.id;
        uploadedUrl = url;
        setDays((prev: CustodyDayData[]) =>
          mergeUpdatedCustodyDay(prev, createdDay, bId, activeStoredLedger)
        );
      } else {
        if (!targetDayId) {
          const createdDay = await custodyService.createDay({
            date: selectedDate,
            added_amount: 0,
            branch_id: activeBranch?.id || undefined,
          });
          targetDayId = createdDay.id;
          setDays((prev: CustodyDayData[]) =>
            mergeUpdatedCustodyDay(prev, createdDay, bId, activeStoredLedger)
          );
        }
        if (invoiceImageUri) {
          uploadedUrl = await custodyService.uploadInvoiceImage(invoiceImageUri);
        }
      }

      const isAdvance = selectedCategory === 'internet_advance' || selectedCategory === 'advance';
      const finalExportNumber = isAdvance || exportNumber.trim() ? exportNumber.trim() : undefined;

      const updatedDay = await custodyService.addExpense(targetDayId!, {
        category: selectedCategory,
        amount: amt,
        recipient_name: expenseRecipient.trim() || '—',
        export_number: finalExportNumber,
        image_url: uploadedUrl,
      });

      if (finalExportNumber) {
        saveLastUsedExportNumber(finalExportNumber).catch(() => {});
      }

      setExpenseAmount('');
      setExpenseRecipient('');
      setExportNumber('');
      setInvoiceImageUri(null);
      setShowAddExpenseModal(false);

      setDays((prev: CustodyDayData[]) =>
        mergeUpdatedCustodyDay(prev, updatedDay, bId, activeStoredLedger)
      );
      void loadCustodyData(true, undefined, true);

      setAlertConfig({
        type: 'success',
        title: 'تم حفظ الفاتورة بنجاح',
        message: 'تم إدراج الفاتورة في جدول العهدة وخصمها من الرصيد المتاح بنجاح.',
      });
    } catch (err: any) {
      setShowAddExpenseModal(false);
      const denied = is403Error(err);
      setAlertConfig({
        type: denied ? 'warning' : 'error',
        title: denied ? 'غير مصرح' : 'فشل حفظ الفاتورة',
        message: denied
          ? 'ليس لديك صلاحية لإضافة الفواتير والمصاريف.'
          : err?.message || 'حدث خطأ أثناء الاتصال بالسيرفر لحفظ الفاتورة.',
      });
      if (denied) refreshProfileOn403();
    } finally {
      setAddExpenseLoading(false);
    }
  };

  // 4. Open & Save Edit Expense
  const handleOpenEditExpense = (item: CustodyExpenseItem) => {
    setEditingExpense(item);
    setEditCategory(item.category);
    setEditAmount(String(item.amount));
    setEditRecipient(item.recipient_name || '');
    setEditExportNumber(
      item.export_number ||
        (item.category === 'internet_advance' || item.category === 'advance'
          ? calculateNextExportNumber(days)
          : '')
    );
    setEditImageUri(item.image_url ? formatImageUrl(item.image_url) : null);
    const parentDay = days.find(
      (d: CustodyDayData) =>
        d.id === item.custody_day_id || d.expenses?.some((e) => e.id === item.id)
    );
    setEditDate(
      parentDay?.date ||
        selectedDate ||
        (item.created_at ? item.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10))
    );
  };

  const handleSaveEditExpense = async () => {
    if (!editingExpense) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      setAlertConfig({
        type: 'warning',
        title: 'قيمة غير صالحة',
        message: 'يرجى إدخال مبلغ صحيح للفاتورة أكبر من الصفر.',
      });
      return;
    }
    try {
      setEditLoading(true);
      let finalImageUrl = editingExpense.image_url || '';
      if (editImageUri) {
        if (editImageUri.startsWith('file://') || editImageUri.startsWith('content://')) {
          finalImageUrl = await custodyService.uploadInvoiceImage(editImageUri);
        }
      } else {
        finalImageUrl = '';
      }

      const isAdvance = editCategory === 'internet_advance' || editCategory === 'advance';
      const finalExportNumber = isAdvance || editExportNumber.trim() ? editExportNumber.trim() : '';
      const finalDate = editDate.trim() || selectedDate;

      const updatedDay = await custodyService.updateExpense(editingExpense.id, {
        category: editCategory,
        amount: amt,
        recipient_name: editRecipient.trim() || '—',
        export_number: finalExportNumber,
        image_url: finalImageUrl,
        date: finalDate,
      });

      if (finalExportNumber) saveLastUsedExportNumber(finalExportNumber).catch(() => {});
      setEditingExpense(null);
      setEditExportNumber('');
      setEditImageUri(null);
      setEditDate('');

      if (finalDate && finalDate !== selectedDate) {
        updateSelectedDate(finalDate);
      } else {
        setDays((prev: CustodyDayData[]) =>
          mergeUpdatedCustodyDay(prev, updatedDay, bId, activeStoredLedger)
        );
      }
      void loadCustodyData(true, undefined, true);
      setAlertConfig({
        type: 'success',
        title: 'تم تعديل الفاتورة',
        message: 'تم تحديث بيانات وتاريخ الفاتورة وإعادة احتساب الرصيد بنجاح.',
      });
    } catch (err: any) {
      setEditingExpense(null);
      const denied = is403Error(err);
      setAlertConfig({
        type: denied ? 'warning' : 'error',
        title: denied ? 'غير مصرح' : 'فشل التعديل',
        message: denied
          ? 'ليس لديك صلاحية لتعديل الفواتير والمصاريف.'
          : err?.message || 'حدث خطأ أثناء تعديل بيانات الفاتورة.',
      });
      if (denied) refreshProfileOn403();
    } finally {
      setEditLoading(false);
    }
  };

  // 5. Delete Expense
  const handleDeleteExpense = (item: CustodyExpenseItem) => {
    if (!canDeleteCustody) {
      setAlertConfig({
        type: 'warning',
        title: 'غير مصرح',
        message: 'ليس لديك صلاحية لحذف الفواتير.',
      });
      return;
    }
    setAlertConfig({
      type: 'confirm',
      title: 'هل تريد الحذف نهائياً؟',
      message: `هل أنت متأكد من رغبتك في حذف فاتورة "${item.recipient_name || item.category}" بمبلغ ${formatArabicNumber(item.amount, 2)} ريال نهائياً؟ سيتم استرجاع المبلغ لحساب العهدة فوراً ولا يمكن التراجع.`,
      primaryButtonText: 'نعم، حذف نهائياً',
      secondaryButtonText: 'إلغاء',
      onPrimaryPress: async () => {
        try {
          const updatedDay = await custodyService.deleteExpense(item.id);
          if (updatedDay && updatedDay.id && updatedDay.date) {
            setDays((prev: CustodyDayData[]) =>
              mergeUpdatedCustodyDay(prev, updatedDay, bId, activeStoredLedger)
            );
          } else {
            setDays((prev: CustodyDayData[]) =>
              prev.map((d) => {
                if (!d.expenses?.some((e) => e.id === item.id)) return d;
                const filtered = d.expenses.filter((e) => e.id !== item.id);
                const newTotal = Math.max(0, (d.total_expenses || 0) - (item.amount || 0));
                return {
                  ...d,
                  expenses: filtered,
                  total_expenses: newTotal,
                  closing_balance: (d.opening_balance || 0) + (d.added_amount || 0) - newTotal,
                };
              })
            );
          }
          void loadCustodyData(true, undefined, true);
          setAlertConfig({
            type: 'success',
            title: 'تم الحذف بنجاح',
            message: 'تم حذف الفاتورة واستعادة المبلغ إلى رصيد العهدة.',
          });
        } catch (err: any) {
          const denied = is403Error(err);
          setAlertConfig({
            type: denied ? 'warning' : 'error',
            title: denied ? 'غير مصرح' : 'فشل الحذف',
            message: denied
              ? 'ليس لديك صلاحية لحذف الفواتير.'
              : err?.message || 'تعذر حذف الفاتورة من السيرفر.',
          });
          if (denied) refreshProfileOn403();
        }
      },
    });
  };

  return {
    handleSaveCustodyAmount,
    handleDeleteCustodyEntry,
    handleSaveExpense,
    handleOpenEditExpense,
    handleSaveEditExpense,
    handleDeleteExpense,
    ...mediaActions,
  };
}

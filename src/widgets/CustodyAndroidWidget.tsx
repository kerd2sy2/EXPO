import React from 'react';
import {
  FlexWidget,
  TextWidget,
  ImageWidget,
} from 'react-native-android-widget';
import { CustodyWidgetProps, DEFAULT_CUSTODY_WIDGET_PROPS } from './CustodyWidgetProps';

export function CustodyAndroidWidget(props: CustodyWidgetProps = DEFAULT_CUSTODY_WIDGET_PROPS) {
  const branches =
    props.branches && props.branches.length > 0 ? props.branches : DEFAULT_CUSTODY_WIDGET_PROPS.branches;
  const activeIdx = Math.min(Math.max(0, props.activeBranchIndex ?? 0), branches.length - 1);
  const activeBranch = branches[activeIdx] || branches[0];

  const netBalanceVal =
    typeof activeBranch?.netBalance === 'number'
      ? activeBranch.netBalance
      : typeof props.netBalance === 'number'
      ? props.netBalance
      : 0;

  const expensesVal =
    typeof activeBranch?.expenses === 'number'
      ? activeBranch.expenses
      : typeof props.expenses === 'number'
      ? props.expenses
      : 0;

  const yesterdayBalanceVal =
    typeof activeBranch?.yesterdayBalance === 'number'
      ? activeBranch.yesterdayBalance
      : typeof props.yesterdayBalance === 'number'
      ? props.yesterdayBalance
      : typeof activeBranch?.openingBalance === 'number'
      ? activeBranch.openingBalance
      : typeof props.openingBalance === 'number'
      ? props.openingBalance
      : 0;

  const addedAmountVal =
    typeof activeBranch?.addedAmount === 'number'
      ? activeBranch.addedAmount
      : typeof props.addedAmount === 'number'
      ? props.addedAmount
      : 0;

  const openingBalance =
    activeBranch?.openingBalance ?? props.openingBalance ?? (netBalanceVal + expensesVal);
  const total =
    openingBalance > 0
      ? openingBalance
      : netBalanceVal + expensesVal > 0
      ? netBalanceVal + expensesVal
      : 1;
  const ratio = Math.max(0, Math.min(1, expensesVal / total));
  const percent = Math.round(ratio * 100);

  // Flex ratio for progress bar (clamped to integers between 1 and 99)
  const flexSpent = Math.max(1, Math.min(99, percent));
  const flexRemaining = 100 - flexSpent;

  const netBalanceText =
    activeBranch?.netBalanceFormatted ||
    props.netBalanceFormatted ||
    netBalanceVal.toLocaleString();

  const yesterdayBalanceText =
    activeBranch?.yesterdayBalanceFormatted ||
    props.yesterdayBalanceFormatted ||
    yesterdayBalanceVal.toLocaleString();

  const addedAmountText =
    activeBranch?.addedAmountFormatted ||
    props.addedAmountFormatted ||
    addedAmountVal.toLocaleString();

  const expensesText =
    activeBranch?.expensesFormatted ||
    props.expensesFormatted ||
    expensesVal.toLocaleString();

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. TOP ROW: صافي العهدة بالأعلى + زر إضافة مصروف بالأعلى */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        {/* صافي العهدة مع أيقونة الرمز وبدون "ر.س" */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="صافي العهدة"
            style={{
              color: '#64748b',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          />
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 2,
            }}
          >
            <ImageWidget
              image={require('../../assets/Saudi_Riyal_Symbol.png')}
              imageWidth={24}
              imageHeight={24}
              style={{ marginRight: 6 }}
            />
            <TextWidget
              text={netBalanceText}
              style={{
                color: '#0f172a',
                fontSize: 24,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* زر إضافة مصروف العريض والأكبر في الأعلى */}
        <FlexWidget
          style={{
            backgroundColor: '#059669',
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'aams-ahda://?action=add_expense' }}
        >
          <TextWidget
            text="+ إضافة مصروف"
            style={{
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 2. MIDDLE ROW: الكروت الثلاثة (باقي أمس - العهدة المضافة - إجمالي المصاريف) */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
          marginBottom: 4,
        }}
      >
        {/* كرت إجمالي المصاريف */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fef2f2',
            borderWidth: 1,
            borderColor: '#fecaca',
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 4,
            marginRight: 4,
          }}
        >
          <TextWidget
            text="إجمالي المصاريف"
            style={{
              color: '#dc2626',
              fontSize: 11,
              fontWeight: 'bold',
              marginBottom: 3,
            }}
          />
          <TextWidget
            text={expensesText}
            style={{
              color: '#b91c1c',
              fontSize: 13,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* كرت العهدة المضافة */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0fdf4',
            borderWidth: 1,
            borderColor: '#bbf7d0',
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 4,
            marginHorizontal: 2,
          }}
        >
          <TextWidget
            text="العهدة المضافة"
            style={{
              color: '#15803d',
              fontSize: 11,
              fontWeight: 'bold',
              marginBottom: 3,
            }}
          />
          <TextWidget
            text={addedAmountText}
            style={{
              color: '#166534',
              fontSize: 13,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* كرت باقي أمس */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 4,
            marginLeft: 4,
          }}
        >
          <TextWidget
            text="باقي أمس"
            style={{
              color: '#64748b',
              fontSize: 11,
              fontWeight: 'bold',
              marginBottom: 3,
            }}
          />
          <TextWidget
            text={yesterdayBalanceText}
            style={{
              color: '#1e293b',
              fontSize: 13,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 3. FOOTER: آخر تحديث في الشمال + شريط النسبة ونسبة الصرف في اليمين */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 2,
        }}
      >
        {/* آخر تحديث ناحية الشمال */}
        <TextWidget
          text={`آخر تحديث: ${props.lastUpdated || 'الآن'}`}
          style={{
            color: '#94a3b8',
            fontSize: 10,
            fontWeight: 'bold',
          }}
        />

        {/* نسبة الصرف مع شريط النسبة ناحية اليمين */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* شريط نسبة الصرف الملون */}
          <FlexWidget
            style={{
              width: 50,
              height: 5,
              backgroundColor: '#e2e8f0',
              borderRadius: 3,
              flexDirection: 'row',
              overflow: 'hidden',
              marginRight: 6,
            }}
          >
            <FlexWidget
              style={{
                flex: flexSpent,
                height: 5,
                backgroundColor: percent > 90 ? '#ef4444' : percent > 70 ? '#f59e0b' : '#10b981',
              }}
            />
            <FlexWidget
              style={{
                flex: flexRemaining,
                height: 5,
                backgroundColor: '#e2e8f0',
              }}
            />
          </FlexWidget>

          <TextWidget
            text={`نسبة الصرف: ${percent}%`}
            style={{
              color: '#64748b',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

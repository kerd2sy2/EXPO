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

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Header: Clean App Badge (Today only, no branch, no flip arrows) */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* App Title Badge: عهدة • اليوم */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ecfdf5',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#a7f3d0',
          }}
        >
          <TextWidget
            text="عهدة"
            style={{
              color: '#059669',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text=" • اليوم"
            style={{
              color: '#047857',
              fontSize: 12,
              fontWeight: 'bold',
              marginLeft: 3,
            }}
          />
        </FlexWidget>

        {/* Timestamp */}
        <TextWidget
          text={`آخر تحديث: ${props.lastUpdated || 'الآن'}`}
          style={{
            color: '#94a3b8',
            fontSize: 10,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>

      {/* 2. Middle Row: Large Hero Balance Display & Expenses Column */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        {/* Net Balance Column (Large, bold, prominent) */}
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text="صافي رصيد العهدة"
            style={{
              color: '#64748b',
              fontSize: 13,
              fontWeight: 'bold',
            }}
          />
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4,
            }}
          >
            {/* Crisp dark Saudi Riyal Symbol Image */}
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
                fontSize: 27,
                fontWeight: 'bold',
              }}
            />
            <TextWidget
              text=" ر.س"
              style={{
                color: '#059669',
                fontSize: 14,
                fontWeight: 'bold',
                marginLeft: 4,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Expenses Column & Action Button (Prominent, large font, beautiful card) */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          {/* Expenses Pill: Large, bold font with soft red background */}
          <FlexWidget
            style={{
              backgroundColor: '#fef2f2',
              borderWidth: 1,
              borderColor: '#fecaca',
              borderRadius: 8,
              paddingHorizontal: 9,
              paddingVertical: 3,
            }}
          >
            <TextWidget
              text={`المصروفات: ${expensesVal.toLocaleString()} ر.س`}
              style={{
                color: '#dc2626',
                fontSize: 13,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>

          {/* Quick Action Button - Click opens app directly into categories sheet */}
          <FlexWidget
            style={{
              marginTop: 6,
              backgroundColor: '#059669',
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 10,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'aams-ahda://?action=add_expense' }}
          >
            <TextWidget
              text="+ إضافة مصروف"
              style={{
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* 3. Footer: Visual Progress Bar & Spending Ratio */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'column',
          marginTop: 6,
        }}
      >
        {/* Progress Bar Container (Thicker 6dp with rounded caps) */}
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 6,
            backgroundColor: '#f1f5f9',
            borderRadius: 3,
            flexDirection: 'row',
            overflow: 'hidden',
          }}
        >
          {/* Spent Portion */}
          <FlexWidget
            style={{
              flex: flexSpent,
              height: 6,
              backgroundColor: '#10b981',
            }}
          />
          {/* Remaining Portion */}
          <FlexWidget
            style={{
              flex: flexRemaining,
              height: 6,
              backgroundColor: '#f1f5f9',
            }}
          />
        </FlexWidget>

        {/* Footer Info Row */}
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <TextWidget
            text={`نسبة الصرف: ${percent}%`}
            style={{
              color: '#475569',
              fontSize: 11,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text="الرصيد المتاح"
            style={{
              color: '#94a3b8',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

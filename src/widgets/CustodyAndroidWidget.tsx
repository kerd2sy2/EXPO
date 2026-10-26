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

  const dateTitle = props.date || props.dateLabel || 'اليوم';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#1e382b',
        backgroundGradient: {
          from: '#0f1917',
          to: '#070e0c',
          orientation: 'TOP_BOTTOM',
        },
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Header: App badge + Branch Switcher */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* App Title Badge */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#162721',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
          }}
        >
          <TextWidget
            text="عهدة"
            style={{
              color: '#10b981',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={` • ${dateTitle}`}
            style={{
              color: '#a7f3d0',
              fontSize: 10,
              marginLeft: 4,
            }}
          />
        </FlexWidget>

        {/* Branch Switcher */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#13211c',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#22382f',
            paddingHorizontal: 4,
            paddingVertical: 2,
          }}
        >
          {/* Previous Branch Arrow */}
          <FlexWidget
            style={{ paddingHorizontal: 6, paddingVertical: 2 }}
            clickAction="SWITCH_BRANCH_PREV"
          >
            <TextWidget
              text="‹"
              style={{
                color: '#10b981',
                fontSize: 16,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>

          {/* Current Branch Name */}
          <TextWidget
            text={activeBranch.branchName || 'الفرع الأول'}
            style={{
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 'bold',
              marginHorizontal: 2,
            }}
          />

          {/* Next Branch Arrow */}
          <FlexWidget
            style={{ paddingHorizontal: 6, paddingVertical: 2 }}
            clickAction="SWITCH_BRANCH_NEXT"
          >
            <TextWidget
              text="›"
              style={{
                color: '#10b981',
                fontSize: 16,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>

          {/* Counter (e.g. 1/2) */}
          {branches.length > 1 && (
            <TextWidget
              text={`(${activeIdx + 1}/${branches.length})`}
              style={{
                color: '#94a3b8',
                fontSize: 9,
                marginLeft: 2,
              }}
            />
          )}
        </FlexWidget>
      </FlexWidget>

      {/* 2. Middle Row: Balance Display & Quick Add Button */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        {/* Net Balance Column */}
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text="صافي رصيد العهدة"
            style={{
              color: '#94a3b8',
              fontSize: 11,
            }}
          />
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 2,
            }}
          >
            {/* Official Saudi Riyal Symbol Image */}
            <ImageWidget
              image={require('../../assets/Saudi_Riyal_Symbol.png')}
              imageWidth={20}
              imageHeight={20}
              style={{ marginRight: 6 }}
            />
            <TextWidget
              text={netBalanceText}
              style={{
                color: '#ffffff',
                fontSize: 22,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Expenses Column & Action Button */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text="المصروفات: "
              style={{
                color: '#94a3b8',
                fontSize: 10,
              }}
            />
            <TextWidget
              text={`${expensesVal.toLocaleString()} ر.س`}
              style={{
                color: '#f87171',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>

          {/* Quick Action Button - Click opens app directly */}
          <FlexWidget
            style={{
              marginTop: 5,
              backgroundColor: '#047857',
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 8,
            }}
            clickAction="OPEN_APP"
          >
            <TextWidget
              text="+ إضافة مصروف"
              style={{
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* 3. Footer: Visual Progress Bar & Timestamp */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'column',
          marginTop: 6,
        }}
      >
        {/* Progress Bar Container */}
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 4,
            backgroundColor: '#1e293b',
            borderRadius: 2,
            flexDirection: 'row',
            overflow: 'hidden',
          }}
        >
          {/* Spent Portion */}
          <FlexWidget
            style={{
              flex: flexSpent,
              height: 4,
              backgroundColor: '#10b981',
            }}
          />
          {/* Remaining Portion */}
          <FlexWidget
            style={{
              flex: flexRemaining,
              height: 4,
              backgroundColor: '#1e293b',
            }}
          />
        </FlexWidget>

        {/* Footer Labels */}
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
              color: '#94a3b8',
              fontSize: 9,
            }}
          />
          <TextWidget
            text={`آخر تحديث: ${props.lastUpdated || 'الآن'}`}
            style={{
              color: '#64748b',
              fontSize: 9,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

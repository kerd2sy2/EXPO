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

  const daysList = props.daysList && props.daysList.length > 0 ? props.daysList : [];
  const hasMultipleDays = daysList.length > 1;
  const dayIdx = Math.min(Math.max(0, props.activeDayIndex ?? 0), Math.max(0, daysList.length - 1));
  const activeDay = daysList[dayIdx];

  const netBalanceVal =
    typeof activeDay?.netBalance === 'number'
      ? activeDay.netBalance
      : typeof activeBranch?.netBalance === 'number'
      ? activeBranch.netBalance
      : typeof props.netBalance === 'number'
      ? props.netBalance
      : 0;

  const expensesVal =
    typeof activeDay?.expenses === 'number'
      ? activeDay.expenses
      : typeof activeBranch?.expenses === 'number'
      ? activeBranch.expenses
      : typeof props.expenses === 'number'
      ? props.expenses
      : 0;

  const openingBalance =
    activeDay?.openingBalance ?? activeBranch?.openingBalance ?? props.openingBalance ?? (netBalanceVal + expensesVal);
  const total =
    openingBalance > 0
      ? openingBalance
      : netBalanceVal + expensesVal > 0
      ? netBalanceVal + expensesVal
      : 1;
  const ratio = Math.max(0, Math.min(1, expensesVal / total));
  const percent =
    activeDay?.progressRatio !== undefined
      ? Math.round(activeDay.progressRatio * 100)
      : Math.round(ratio * 100);

  // Flex ratio for progress bar (clamped to integers between 1 and 99)
  const flexSpent = Math.max(1, Math.min(99, percent));
  const flexRemaining = 100 - flexSpent;

  const netBalanceText =
    activeDay?.netBalanceFormatted ||
    activeBranch?.netBalanceFormatted ||
    props.netBalanceFormatted ||
    netBalanceVal.toLocaleString();

  const dateTitle = activeDay?.dateLabel || props.date || props.dateLabel || 'اليوم';
  const hasMultipleBranches = branches.length > 1;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 13,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Header: Date / Day Switcher Capsule + Branch Display */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Day Switcher Capsule (Allows switching between today, yesterday, previous days) */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            paddingHorizontal: hasMultipleDays ? 5 : 8,
            paddingVertical: 3,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}
        >
          {hasMultipleDays && (
            <FlexWidget
              style={{ paddingHorizontal: 5, paddingVertical: 1 }}
              clickAction="SWITCH_DAY_NEXT"
            >
              <TextWidget
                text="›"
                style={{
                  color: '#059669',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              />
            </FlexWidget>
          )}

          <TextWidget
            text="عهدة"
            style={{
              color: '#059669',
              fontSize: 11,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={` • ${dateTitle}`}
            style={{
              color: '#334155',
              fontSize: 11,
              fontWeight: 'bold',
              marginLeft: 3,
            }}
          />

          {hasMultipleDays && (
            <FlexWidget
              style={{ paddingHorizontal: 5, paddingVertical: 1 }}
              clickAction="SWITCH_DAY_PREV"
            >
              <TextWidget
                text="‹"
                style={{
                  color: '#059669',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              />
            </FlexWidget>
          )}
        </FlexWidget>

        {/* Branch Capsule (Shows switcher arrows ONLY if user has permission for multiple branches) */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            borderRadius: 9,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            paddingHorizontal: hasMultipleBranches ? 4 : 8,
            paddingVertical: 3,
          }}
        >
          {hasMultipleBranches && (
            <FlexWidget
              style={{ paddingHorizontal: 5, paddingVertical: 1 }}
              clickAction="SWITCH_BRANCH_PREV"
            >
              <TextWidget
                text="‹"
                style={{
                  color: '#0284c7',
                  fontSize: 15,
                  fontWeight: 'bold',
                }}
              />
            </FlexWidget>
          )}

          {/* Current Branch Name */}
          <TextWidget
            text={activeBranch.branchName || 'الفرع الأول'}
            style={{
              color: '#0f172a',
              fontSize: 11,
              fontWeight: 'bold',
              marginHorizontal: 3,
            }}
          />

          {hasMultipleBranches && (
            <FlexWidget
              style={{ paddingHorizontal: 5, paddingVertical: 1 }}
              clickAction="SWITCH_BRANCH_NEXT"
            >
              <TextWidget
                text="›"
                style={{
                  color: '#0284c7',
                  fontSize: 15,
                  fontWeight: 'bold',
                }}
              />
            </FlexWidget>
          )}

          {/* Counter if multi-branch */}
          {hasMultipleBranches && (
            <TextWidget
              text={`(${activeIdx + 1}/${branches.length})`}
              style={{
                color: '#64748b',
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
              color: '#64748b',
              fontSize: 11,
              fontWeight: 'bold',
            }}
          />
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 3,
            }}
          >
            {/* Crisp dark Saudi Riyal Symbol Image for light card surface */}
            <ImageWidget
              image={require('../../assets/Saudi_Riyal_Symbol.png')}
              imageWidth={20}
              imageHeight={20}
              style={{ marginRight: 6 }}
            />
            <TextWidget
              text={netBalanceText}
              style={{
                color: '#0f172a',
                fontSize: 22,
                fontWeight: 'bold',
              }}
            />
            <TextWidget
              text=" ر.س"
              style={{
                color: '#059669',
                fontSize: 12,
                fontWeight: 'bold',
                marginLeft: 3,
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
          {/* Expenses label & value combined to guarantee RTL Arabic word order */}
          <TextWidget
            text={`المصروفات: ${expensesVal.toLocaleString()} ر.س`}
            style={{
              color: '#dc2626',
              fontSize: 11,
              fontWeight: 'bold',
            }}
          />

          {/* Quick Action Button - Opens app and brings up categories sheet */}
          <FlexWidget
            style={{
              marginTop: 5,
              backgroundColor: '#059669',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'aams-ahda://home?action=add_expense' }}
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
            height: 5,
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
              height: 5,
              backgroundColor: '#10b981',
            }}
          />
          {/* Remaining Portion */}
          <FlexWidget
            style={{
              flex: flexRemaining,
              height: 5,
              backgroundColor: '#f1f5f9',
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
              color: '#64748b',
              fontSize: 9,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={`آخر تحديث: ${props.lastUpdated || 'الآن'}`}
            style={{
              color: '#94a3b8',
              fontSize: 9,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

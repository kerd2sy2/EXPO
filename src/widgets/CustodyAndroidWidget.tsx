import React from 'react';
import {
  FlexWidget,
  TextWidget,
  ImageWidget,
} from 'react-native-android-widget';
import { CustodyWidgetProps, DEFAULT_CUSTODY_WIDGET_PROPS } from './CustodyWidgetProps';

export function CustodyAndroidWidget(props: CustodyWidgetProps = DEFAULT_CUSTODY_WIDGET_PROPS) {
  const branches = props.branches && props.branches.length > 0 ? props.branches : DEFAULT_CUSTODY_WIDGET_PROPS.branches;
  const activeIdx = Math.min(Math.max(0, props.activeBranchIndex ?? 0), branches.length - 1);
  const activeBranch = branches[activeIdx] || branches[0];

  const netBalance = activeBranch.netBalance ?? 0;
  const expenses = activeBranch.expenses ?? 0;
  const openingBalance = activeBranch.openingBalance ?? (netBalance + expenses);
  const total = openingBalance > 0 ? openingBalance : (netBalance + expenses > 0 ? netBalance + expenses : 1);
  const ratio = Math.max(0, Math.min(1, expenses / total));
  const percent = Math.round(ratio * 100);

  // Flex ratio for progress bar (clamped to integers between 1 and 100)
  const flexSpent = Math.max(1, Math.min(99, percent));
  const flexRemaining = 100 - flexSpent;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#00fa91',
        backgroundGradient: {
          from: '#052317',
          to: '#02100a',
          orientation: 'TOP_BOTTOM',
        },
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'ahda://' }}
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
            backgroundColor: '#063a25',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
          }}
        >
          <TextWidget
            text="عهدة"
            style={{
              color: '#00fa91',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={` • ${props.date || 'اليوم'}`}
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
            backgroundColor: '#0c2e21',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#00fa91',
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
                color: '#00fa91',
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
                color: '#00fa91',
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
                color: '#6ee7b7',
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
              color: '#a7f3d0',
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
              text={netBalance.toLocaleString()}
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
              text={`${expenses.toLocaleString()} ر.س`}
              style={{
                color: '#f87171',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>

          {/* Quick Action Button */}
          <FlexWidget
            style={{
              marginTop: 5,
              backgroundColor: '#00fa91',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 10,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'ahda://' }}
          >
            <TextWidget
              text="+ إضافة مصروف"
              style={{
                color: '#021f13',
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
            backgroundColor: '#0e3a29',
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
              backgroundColor: '#00fa91',
            }}
          />
          {/* Remaining Portion */}
          <FlexWidget
            style={{
              flex: flexRemaining,
              height: 4,
              backgroundColor: '#0e3a29',
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
            marginTop: 3,
          }}
        >
          <TextWidget
            text={`نسبة الصرف: ${percent}%`}
            style={{
              color: '#6ee7b7',
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

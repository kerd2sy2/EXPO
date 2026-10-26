import { VStack, HStack, Text, Image, ProgressView, Spacer, Button } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
  background,
  cornerRadius,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { CustodyWidgetProps } from './CustodyWidgetProps';

const CustodyWidget = (props: CustodyWidgetProps, _environment: WidgetEnvironment) => {
  'widget';

  const cardBg = '#0b1612';
  const brandMint = '#00fa91';
  const textWhite = '#ffffff';
  const textMuted = '#94a3b8';
  const badgeBg = '#143828';
  const branchPillBg = '#162b21';

  const currentBranches = props.branches && props.branches.length > 0
    ? props.branches
    : [{ branchId: 'default', branchName: 'الفرع الأول', netBalanceFormatted: '٠.٠٠', expensesFormatted: '٠.٠٠', progressRatio: 0 }];
  const currentIndex = props.activeBranchIndex ?? 0;
  const activeBranch = currentBranches[currentIndex % currentBranches.length] || currentBranches[0];

  const currentBranchName = activeBranch.branchName || props.branchName || 'الفرع الأول';
  const netBal = activeBranch.netBalanceFormatted || props.netBalanceFormatted || '٠.٠٠';
  const expAmt = activeBranch.expensesFormatted || props.expensesFormatted || '٠.٠٠';
  const dateLbl = props.dateLabel || 'اليوم';
  const ratio = Math.max(0, Math.min(1, activeBranch.progressRatio ?? props.progressRatio ?? 0));
  const hasMultipleBranches = currentBranches.length > 1;

  let dots = '●';
  if (hasMultipleBranches) {
    let d = '';
    for (let i = 0; i < currentBranches.length; i++) {
      d += i === currentIndex % currentBranches.length ? '● ' : '○ ';
    }
    dots = d.trim();
  }

  return (
    <VStack
      modifiers={[
        background(cardBg),
        padding({ all: 14 }),
        cornerRadius(24),
      ]}
    >
      {/* Top Header: Title + Date Badge */}
      <HStack>
        <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(textWhite)]}>
          صافي العهدة المتبقي
        </Text>
        <Spacer />
        <HStack modifiers={[background(badgeBg), padding({ top: 2, bottom: 2, leading: 8, trailing: 8 }), cornerRadius(10)]}>
          <Text modifiers={[font({ weight: 'bold', size: 11 }), foregroundStyle(brandMint)]}>
            {dateLbl}
          </Text>
        </HStack>
      </HStack>

      <Spacer />

      {/* Branch Switcher Pill with Indicator Dots */}
      <HStack>
        {hasMultipleBranches ? (
          <Button
            label={`‹  ${currentBranchName}  ›   ${dots}`}
            target="switch_branch"
            onPress={() => {
              const nextIdx = (currentIndex + 1) % currentBranches.length;
              const nextActive = currentBranches[nextIdx] || currentBranches[0];
              return {
                activeBranchIndex: nextIdx,
                branchName: nextActive.branchName,
                netBalanceFormatted: nextActive.netBalanceFormatted,
                expensesFormatted: nextActive.expensesFormatted,
                progressRatio: nextActive.progressRatio,
              } as any;
            }}
          />
        ) : (
          <HStack modifiers={[background(branchPillBg), padding({ top: 2, bottom: 2, leading: 8, trailing: 8 }), cornerRadius(10)]}>
            <Text modifiers={[font({ weight: 'bold', size: 11 }), foregroundStyle(brandMint)]}>
              {currentBranchName}
            </Text>
          </HStack>
        )}
      </HStack>

      <Spacer />

      {/* Main Balance with Saudi Riyal Icon */}
      <HStack>
        <Text modifiers={[font({ weight: 'bold', size: 28 }), foregroundStyle(textWhite)]}>
          {netBal}
        </Text>
        <Spacer />
        {props.hasSymbolImage && props.symbolImagePath ? (
          <Image uiImage={props.symbolImagePath} size={26} />
        ) : (
          <HStack modifiers={[background(badgeBg), padding({ top: 2, bottom: 2, leading: 6, trailing: 6 }), cornerRadius(8)]}>
            <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(brandMint)]}>
              ر.س
            </Text>
          </HStack>
        )}
      </HStack>

      <Spacer />

      {/* Daily Spending Progress Bar */}
      <ProgressView value={ratio} />

      <Spacer />

      {/* Bottom Bar: Expenses Text + Add Expense Action */}
      <HStack>
        <Text modifiers={[font({ weight: 'medium', size: 11 }), foregroundStyle(textMuted)]}>
          {`المصروف: ${expAmt}`}
        </Text>
        <Spacer />
        <Button
          label="+ إضافة مصروف"
          target="add_expense"
        />
      </HStack>
    </VStack>
  );
};

export default createWidget('CustodyWidget', CustodyWidget);

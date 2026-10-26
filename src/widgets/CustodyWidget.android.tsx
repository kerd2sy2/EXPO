import { Box, Column, Row, Text, Image, LinearProgressIndicator, Spacer, Button } from '@expo/ui/jetpack-compose';
import {
  paddingAll,
  padding,
  background,
  clip,
  Shapes,
  fillMaxWidth,
  fillMaxSize,
  height,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { CustodyWidgetProps } from './CustodyWidgetProps';

const CustodyWidget = (props: CustodyWidgetProps, _environment: WidgetEnvironment) => {
  'widget';

  const cardBg = '#0b1612';
  const brandMint = '#00fa91';
  const textWhite = '#ffffff';
  const textMuted = '#94a3b8';
  const badgeBg = '#143828';
  const badgeText = '#00fa91';
  const trackBg = '#1c2e26';
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
    <Box
      modifiers={[
        fillMaxSize(),
        background(cardBg),
        paddingAll(14),
        clip(Shapes.RoundedCorner(24)),
      ]}
    >
      <Column modifiers={[fillMaxWidth()]}>
        {/* Top Header: Title + Date Badge */}
        <Row modifiers={[fillMaxWidth()]}>
          <Text
            color={textWhite}
            style={{ fontSize: 13, fontWeight: 'bold' }}
          >
            صافي العهدة المتبقي
          </Text>
          <Spacer />
          <Box
            modifiers={[
              background(badgeBg),
              padding(8, 2, 8, 2),
              clip(Shapes.RoundedCorner(10)),
            ]}
          >
            <Text color={badgeText} style={{ fontSize: 11, fontWeight: 'bold' }}>
              {dateLbl}
            </Text>
          </Box>
        </Row>

        <Spacer modifiers={[height(6)]} />

        {/* Branch Switcher Pill with Indicator Dots */}
        <Row modifiers={[fillMaxWidth()]}>
          {hasMultipleBranches ? (
            <Button
              onClick={() => {
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
              modifiers={[
                background(branchPillBg),
                padding(10, 3, 10, 3),
                clip(Shapes.RoundedCorner(12)),
              ]}
            >
              <Text color={brandMint} style={{ fontSize: 11, fontWeight: 'bold' }}>
                {`‹  ${currentBranchName}  ›   ${dots}`}
              </Text>
            </Button>
          ) : (
            <Box
              modifiers={[
                background(branchPillBg),
                padding(8, 2, 8, 2),
                clip(Shapes.RoundedCorner(10)),
              ]}
            >
              <Text color={brandMint} style={{ fontSize: 11, fontWeight: 'bold' }}>
                {currentBranchName}
              </Text>
            </Box>
          )}
        </Row>

        <Spacer modifiers={[height(8)]} />

        {/* Main Balance with Saudi Riyal Icon */}
        <Row modifiers={[fillMaxWidth()]}>
          <Text
            color={textWhite}
            style={{ fontSize: 28, fontWeight: 'bold' }}
          >
            {netBal}
          </Text>
          <Spacer modifiers={[size(8, 1)]} />
          {props.hasSymbolImage && props.symbolImagePath ? (
            <Image
              source={{ uri: props.symbolImagePath }}
              modifiers={[size(26, 26)]}
            />
          ) : (
            <Box
              modifiers={[
                background(badgeBg),
                padding(6, 2, 6, 2),
                clip(Shapes.RoundedCorner(8)),
              ]}
            >
              <Text color={brandMint} style={{ fontSize: 13, fontWeight: 'bold' }}>
                ر.س
              </Text>
            </Box>
          )}
        </Row>

        <Spacer modifiers={[height(8)]} />

        {/* Daily Spending Progress Bar */}
        <Box modifiers={[fillMaxWidth(), height(6), background(trackBg), clip(Shapes.RoundedCorner(3))]}>
          <LinearProgressIndicator
            progress={ratio}
            color={brandMint}
            trackColor={trackBg}
            modifiers={[fillMaxWidth(), height(6), clip(Shapes.RoundedCorner(3))]}
          />
        </Box>

        <Spacer modifiers={[height(10)]} />

        {/* Bottom Bar: Expenses Text + Add Expense Action */}
        <Row modifiers={[fillMaxWidth()]}>
          <Text color={textMuted} style={{ fontSize: 11, fontWeight: '500' }}>
            {`المصروف: ${expAmt}`}
          </Text>
          <Spacer />
          <Button
            onClick={() => {}}
            modifiers={[
              background(badgeBg),
              padding(10, 4, 10, 4),
              clip(Shapes.RoundedCorner(12)),
            ]}
          >
            <Text color={brandMint} style={{ fontSize: 11, fontWeight: 'bold' }}>
              + إضافة مصروف
            </Text>
          </Button>
        </Row>
      </Column>
    </Box>
  );
};

export default createWidget('CustodyWidget', CustodyWidget);

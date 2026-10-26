import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustodyAndroidWidget } from './CustodyAndroidWidget';
import { CustodyWidgetProps, DEFAULT_CUSTODY_WIDGET_PROPS } from './CustodyWidgetProps';

const STORAGE_KEY = '@custody_widget_data';

async function getStoredWidgetData(): Promise<CustodyWidgetProps> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as CustodyWidgetProps;
      }
    }
  } catch (err) {
    console.warn('[CustodyWidget] Failed to read cached widget data:', err);
  }
  return DEFAULT_CUSTODY_WIDGET_PROPS;
}

async function saveWidgetData(data: CustodyWidgetProps): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[CustodyWidget] Failed to save widget data:', err);
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction } = props;

  let data = await getStoredWidgetData();
  const branches = data.branches && data.branches.length > 0 ? data.branches : DEFAULT_CUSTODY_WIDGET_PROPS.branches;
  let activeIdx = data.activeBranchIndex ?? 0;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
      break;

    case 'WIDGET_CLICK':
      if (clickAction === 'SWITCH_BRANCH_NEXT') {
        activeIdx = (activeIdx + 1) % branches.length;
        data = { ...data, activeBranchIndex: activeIdx };
        await saveWidgetData(data);
        props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
      } else if (clickAction === 'SWITCH_BRANCH_PREV') {
        activeIdx = (activeIdx - 1 + branches.length) % branches.length;
        data = { ...data, activeBranchIndex: activeIdx };
        await saveWidgetData(data);
        props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
      }
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
      break;
  }
}

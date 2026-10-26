import { Platform } from 'react-native';
import { CustodyWidgetProps, DEFAULT_CUSTODY_WIDGET_PROPS } from './CustodyWidgetProps';

let CustodyWidgetInstance: any = null;

try {
  if (Platform.OS === 'android') {
    CustodyWidgetInstance = require('./CustodyWidget.android').default;
  } else if (Platform.OS === 'ios') {
    CustodyWidgetInstance = require('./CustodyWidget.ios').default;
  }
} catch (_) {}

export default CustodyWidgetInstance || {
  updateSnapshot: (_props: Partial<CustodyWidgetProps>) => {},
  reload: () => {},
};

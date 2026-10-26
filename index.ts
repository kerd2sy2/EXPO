import { registerWidgetTaskHandler } from 'react-native-android-widget';
import 'expo-router/entry';
import { widgetTaskHandler } from './src/widgets/CustodyWidgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);

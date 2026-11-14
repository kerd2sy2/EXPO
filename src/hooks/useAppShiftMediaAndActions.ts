import { ShiftActionsDeps, useShiftMediaHandlers } from './useShiftMediaHandlers';
import { useShiftSubmitActions } from './useShiftSubmitActions';

export function useAppShiftMediaAndActions(deps: ShiftActionsDeps) {
  const media = useShiftMediaHandlers(deps);
  const submit = useShiftSubmitActions(deps);
  return { ...media, ...submit };
}

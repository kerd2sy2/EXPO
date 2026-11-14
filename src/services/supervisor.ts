export {
  isDeliveryDelegate,
  isEmployeeInBranch,
} from './supervisor/supervisorTypes';

export type {
  BranchStats,
  ServerDashboardStats,
  DelegateWithStatus,
  SupervisorStartShiftParams,
  SupervisorEndShiftParams,
  ReviewSessionParams,
  OperationVideo,
  UploadOperationVideoParams,
  PendingAdvanceRequest,
  CreateEmployeeReportParams,
  PendingMaintenanceRequest,
} from './supervisor/supervisorTypes';

import { supervisorDelegatesApi } from './supervisor/supervisorDelegatesApi';
import { supervisorRequestsAndMediaApi } from './supervisor/supervisorRequestsAndMediaApi';

export const supervisorApi = {
  ...supervisorDelegatesApi,
  ...supervisorRequestsAndMediaApi,
};

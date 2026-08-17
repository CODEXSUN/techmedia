export type HrRequestApproval = {
  approvedAt: string;
  approvedBy: string;
  comment: string;
};

export type HrStaffRequest = {
  approvals: HrRequestApproval[];
  createdAt: string;
  date: string;
  days: number;
  details: string;
  employee: string;
  modifiedAt: string;
  name: string;
  requestType: string;
};

export type HrStaffRequestSavePayload = {
  date: string;
  days: number;
  details: string;
  requestType: string;
};

export type HrStaffRequestView = "all" | "my";

export enum ExamStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED"
}

export enum ResultStatus {
  PASS = "PASS",
  FAIL = "FAIL"
}

export enum CheatingEventType {
  TAB_SWITCH = "TAB_SWITCH",
  FULLSCREEN_EXIT = "FULLSCREEN_EXIT"
}

export const EXAM_STATUSES = Object.values(ExamStatus);
export const RESULT_STATUSES = Object.values(ResultStatus);
export const CHEATING_EVENT_TYPES = Object.values(CheatingEventType); 
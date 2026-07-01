// Borrow/loan status -> badge tone. Used across student/librarian/admin tables.
export const BORROW_STATUS = {
  ACTIVE: "active",
  DUE_SOON: "due_soon",
  OVERDUE: "overdue",
  RETURNED: "returned",
  LATE: "late",
};

export const BORROW_STATUS_META = {
  [BORROW_STATUS.ACTIVE]:   { label: "Active",      tone: "green" },
  [BORROW_STATUS.DUE_SOON]: { label: "Due Soon",    tone: "amber" },
  [BORROW_STATUS.OVERDUE]:  { label: "Overdue",     tone: "red" },
  [BORROW_STATUS.RETURNED]: { label: "Returned",    tone: "green" },
  [BORROW_STATUS.LATE]:     { label: "Late Return", tone: "red" },
};

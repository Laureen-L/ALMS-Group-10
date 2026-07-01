// Book stock status -> badge tone. Used by StatusBadge + catalog tables.
export const BOOK_STATUS = {
  AVAILABLE: "available",
  LOW_STOCK: "low_stock",
  OUT_OF_STOCK: "out_of_stock",
};

export const BOOK_STATUS_META = {
  [BOOK_STATUS.AVAILABLE]:     { label: "Available",    tone: "green" },
  [BOOK_STATUS.LOW_STOCK]:     { label: "Low Stock",    tone: "amber" },
  [BOOK_STATUS.OUT_OF_STOCK]:  { label: "Out of Stock", tone: "red" },
};

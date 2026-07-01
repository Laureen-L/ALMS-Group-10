// StatusBadge — renders a borrow OR book status with the right tone + label.
// Pass a status key from constants/borrowStatus or constants/bookStatus.
import Badge from "../ui/Badge.jsx";
import { BORROW_STATUS_META } from "../../constants/borrowStatus.js";
import { BOOK_STATUS_META } from "../../constants/bookStatus.js";

const META = { ...BORROW_STATUS_META, ...BOOK_STATUS_META };

export default function StatusBadge({ status }) {
  const meta = META[status] || { label: status, tone: "neutral" };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

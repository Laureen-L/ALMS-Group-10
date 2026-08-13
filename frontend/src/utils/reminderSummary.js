// Turns a POST /admin/send-overdue-reminders response into the sentence the
// librarian reads. Shared by the three screens that trigger reminders, so they
// can't drift into describing the same result three different ways.
//
// The wording has to work in two worlds: with Termii configured, and without.
// Until the sender ID is approved, `remindersSent` is 0 on every run — saying
// only "0 reminders sent" would read as a failure when in fact every member
// was notified in the app.

/**
 * Summarise a bulk run. Returns { type: "ok" | "err", text }.
 * `type` drives the message colour, so it reflects whether anything actually
 * went wrong — not merely whether SMS was involved.
 */
export function summarizeReminderRun(res) {
  const notified = res.notified || 0;
  const already = res.alreadyNotified || 0;
  const sent = res.remindersSent || 0;
  const skipped = res.skipped?.length || 0;
  const failed = res.failed?.length || 0;
  const notifyFailed = res.notifyFailed?.length || 0;

  if (!res.totalOverdue) {
    return { type: "ok", text: "No overdue loans to remind about." };
  }

  const parts = [`${notified} member(s) notified in the app`];

  // Only worth mentioning when it happened — otherwise every run carries a
  // trailing "0 already had an unread notice".
  if (already) parts.push(`${already} already had an unread notice`);

  if (res.smsConfigured) {
    parts.push(`${sent} also texted`);
    if (skipped) parts.push(`${skipped} with no phone number`);
    if (failed) parts.push(`${failed} SMS failed`);
  } else {
    parts.push("SMS is not configured yet, so no texts were sent");
  }

  if (notifyFailed) parts.push(`${notifyFailed} could not be notified`);

  return {
    // An unsent SMS is not an error while Termii is still being set up. A
    // failed in-app notice, or a rejected message, is.
    type: failed > 0 || notifyFailed > 0 ? "err" : "ok",
    text: `${parts.join(", ")}.`,
  };
}

/**
 * Summarise a single-member "Remind" click. Returns { tone, text } where tone
 * is a ToastContext method name.
 */
export function summarizeSingleReminder(res, memberName) {
  const who = memberName || "The member";

  if (res.notifyFailed?.length) {
    return { tone: "error", text: res.notifyFailed[0].reason || "Reminder could not be sent." };
  }

  const created = (res.notified || 0) > 0;
  const already = (res.alreadyNotified || 0) > 0;

  if (!created && !already) {
    return { tone: "error", text: res.failed?.[0]?.reason || "Reminder could not be sent." };
  }

  // Clicking "Remind" twice doesn't stack notices, and saying "notified" again
  // would suggest it did. Say what actually happened instead.
  const appPart = created
    ? `${who} was notified in the app`
    : `${who} already had an unread notice`;

  if (res.remindersSent > 0) {
    return { tone: "success", text: `${appPart}; the SMS was also sent.` };
  }

  if (res.failed?.length) {
    // The notice landed; only the text failed. Not a success, not a total loss.
    return { tone: "info", text: `${appPart}; the SMS failed: ${res.failed[0].reason}` };
  }

  if (res.skipped?.length) {
    return { tone: "info", text: `${appPart} (no phone number on file for SMS).` };
  }

  return { tone: created ? "success" : "info", text: `${appPart}.` };
}

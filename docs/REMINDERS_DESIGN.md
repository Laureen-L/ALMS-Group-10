# ALMS — Overdue & Due-Soon Reminder System (Design)

Status: **Design proposal** (not yet built as an automated job). This documents *how*
reminders will be sent so the team can agree the approach before wiring it up.

The UI already has manual triggers today:
- Librarian dashboard → Overdue tab → **Remind** button (one member).
- Admin → Reports → **Send Overdue Reminders** (everyone overdue).

Both call `POST /api/admin/send-overdue-reminders`. This design adds the **automatic,
scheduled** layer on top of those manual triggers.

---

## 1. Channels

| Channel | Use | Status |
|---|---|---|
| **Email** (primary) | Due-soon + overdue notices | Recommended primary — every member has an email on file |
| **SMS** (secondary) | Overdue escalation only | Endpoint already exists; depends on a phone number being present |
| **In-app** (future) | A bell/notification badge | Out of scope for v1 |

Email is the default because sign-up already captures a `@knust.edu.gh` address, whereas
phone numbers are optional (the SMS path already skips members with no number on file).

Provider: reuse the project's existing Supabase/SendGrid email path.

---

## 2. Timing rules

A single daily job evaluates every **active** loan against its `due_date`:

| Trigger | When | Message |
|---|---|---|
| Due soon | 3 days before due date | "Your book is due in 3 days" |
| Due today | On the due date | "Your book is due today" |
| Overdue | 1 day after due date | "Your book is overdue — please return it" |
| Escalation | 7 days after due date | "Your book is seriously overdue" (email **+ SMS**) |

Each loan receives at most **one** reminder per trigger (tracked so the daily job never
double-sends — see the data model below).

---

## 3. Scheduler

- A daily cron job (e.g. Supabase scheduled function / node-cron) runs at **07:00 GMT**.
- Steps: query loans due in the trigger windows → for each, check it hasn't already been
  reminded for that trigger → render the template → send → record the send.
- Idempotent: safe to re-run; already-sent triggers are skipped.

```
cron "0 7 * * *"  ->  scanDueLoans()  ->  for each loan:
                        pickTrigger(loan)  ->  alreadySent? skip
                                            ->  sendEmail(+SMS if escalation)
                                            ->  recordReminder(loan, trigger)
```

---

## 4. Message template (email)

```
Subject: [KNUST Library] {{book_title}} is {{status_phrase}}

Hi {{member_first_name}},

This is a reminder that "{{book_title}}" by {{book_author}} is {{status_phrase}}
({{due_date}}).

Please return or renew it to avoid late fees.

— KNUST Library
```

`status_phrase` = "due in 3 days" / "due today" / "overdue" / "seriously overdue".

---

## 5. Backend endpoints

| Method | Path | Purpose | Exists? |
|---|---|---|---|
| POST | `/api/admin/send-overdue-reminders` | Manual send (all, or one `loanId`) | ✅ today |
| POST | `/api/jobs/run-reminders` | Invoked by the daily scheduler | ➕ new |
| GET | `/api/admin/reminders/log` | Audit of what was sent, when | ➕ new |

---

## 6. Data model (new)

A `reminders` table gives idempotency and an audit trail:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `loan_id` | uuid | FK → borrows |
| `trigger` | text | `due_soon` \| `due_today` \| `overdue` \| `escalation` |
| `channel` | text | `email` \| `sms` |
| `sent_at` | timestamptz | |
| `status` | text | `sent` \| `skipped` \| `failed` |

Unique index on `(loan_id, trigger)` enforces "one reminder per trigger per loan".

---

## 7. Opt-out & preferences (future)

- A member preference (`reminders_opt_in`, default true) on the profile.
- The daily job skips members who opted out; overdue escalation can be made mandatory.
- Every email includes an unsubscribe/manage-preferences link.

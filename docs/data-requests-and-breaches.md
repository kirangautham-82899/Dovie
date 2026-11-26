# Data requests and breaches: internal process (draft)

The public version is at `/data-requests`. **Both are drafts.** A lawyer must confirm the legal duties and time
limits below before launch; they were drafted from general knowledge, not legal advice.

## Who answers

| Role | Person | Backup |
|---|---|---|
| Grievance contact: reads `NEXT_PUBLIC_SUPPORT_EMAIL` daily | _name_ | _name_ |
| Incident lead: decides and acts during a breach | _name_ | _name_ |

## Data requests

| Step | Time limit |
|---|---|
| Acknowledge | 3 working days |
| Answer in full, or explain the delay and give a date | 30 days |

1. Log it: date, account email, type of request, due date.
2. Check identity: the request comes from the account's own address, or the person proves control of it. Never
   ask for a password or a one-time code.
3. Point to Settings where it does the job (export, clear, delete). Otherwise act through the Supabase
   dashboard, touching only that account.
4. Reply with what was done, and close the log entry.

## Breaches

A breach is any unauthorised access to, or disclosure, change or loss of, personal data. Dovie holds health,
cycle, mental-health, location, money and journal data, so treat any doubt as serious.

**First hour**

1. Note the time you found out; the legal clocks start from it. Open an incident log.
2. Contain it: revoke or rotate exposed keys (Supabase, Vercel, AI, Resend, Sentry), disable the affected
   route or feature, and sign out sessions if accounts are at risk.
3. Keep evidence: export Supabase, Vercel and Sentry logs before they expire.

**Notify** (confirm each with the lawyer)

| Who | When |
|---|---|
| CERT-In (reportable cyber incidents) | within **6 hours** of noticing |
| Data Protection Board of India (DPDP Act and Rules) | an initial notice **without delay**; the detailed report within **72 hours** |
| Affected people, by email | **without delay** |

The DPDP duties come into force in stages. Ask the lawyer what applies on the launch date; until then, follow
this table anyway.

**The notice to affected people** says, in plain words: what happened and when, which data, what it could mean
for them, what has been done, what they should do, and how to reach the grievance contact.

**Within two weeks:** write down the cause, the fix and what will stop it happening again.

## Contacts to fill in

- Lawyer: _name, phone_
- CERT-In incident reporting: see cert-in.org.in
- Supabase, Vercel, Sentry and Resend support: through each dashboard

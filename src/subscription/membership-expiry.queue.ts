/**
 * Queue for the membership term sweep (USR-3). Separate from the notifications
 * queue so the subscription module does not need the notifications worker and
 * the notifications module never depends on subscriptions.
 */
export const MEMBERSHIPS_QUEUE = 'memberships';

/** Repeatable job: expire ended terms and warn about ones ending soon. */
export const EXPIRY_SWEEP_JOB = 'membership-expiry-sweep';

/** How often the sweep runs. A term ends at most this long after its end date. */
export const EXPIRY_SWEEP_EVERY_MS = 60 * 60 * 1000;

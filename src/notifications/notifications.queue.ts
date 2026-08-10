/** Queue that carries notification delivery off the request path. */
export const NOTIFICATIONS_QUEUE = 'notifications';

export const DELIVER_JOB = 'deliver-notification';

/**
 * Repeatable housekeeping job. Shares the delivery queue rather than adding a
 * second one — it runs once a day and would otherwise mean another queue,
 * another worker and another thing to monitor for a single `deleteMany`.
 */
export const PURGE_JOB = 'purge-notifications';

/**
 * Only the row id travels on the queue. Everything the worker needs is already
 * persisted on the `Notification` row, so a retry minutes later renders from
 * the same data, and a job can't carry a stale copy of the payload.
 */
export interface DeliverJobData {
  notificationId: number;
}

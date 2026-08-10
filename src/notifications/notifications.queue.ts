/** Queue that carries notification delivery off the request path. */
export const NOTIFICATIONS_QUEUE = 'notifications';

export const DELIVER_JOB = 'deliver-notification';

/**
 * Only the row id travels on the queue. Everything the worker needs is already
 * persisted on the `Notification` row, so a retry minutes later renders from
 * the same data, and a job can't carry a stale copy of the payload.
 */
export interface DeliverJobData {
  notificationId: number;
}

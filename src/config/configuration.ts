export default () => ({
  port: parseInt(process.env.PORT || '4001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  mail: {
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.MAIL || '',
    password: process.env.PASSWORD || '',
  },
  notifications: {
    /**
     * How long a read notification stays in the feed before the daily purge
     * removes it. Unread rows are kept regardless of age.
     */
    retentionDays: parseInt(
      process.env.NOTIFICATION_RETENTION_DAYS || '60',
      10,
    ),
    /** Cadence of that purge. */
    purgeEveryHours: parseInt(
      process.env.NOTIFICATION_PURGE_EVERY_HOURS || '24',
      10,
    ),
  },
  push: {
    /**
     * Only required once push security is switched on in the Expo project;
     * without it Expo accepts unauthenticated sends.
     */
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN || '',
  },
});

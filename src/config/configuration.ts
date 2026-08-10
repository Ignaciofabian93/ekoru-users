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
  push: {
    /**
     * Only required once push security is switched on in the Expo project;
     * without it Expo accepts unauthenticated sends.
     */
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN || '',
  },
});

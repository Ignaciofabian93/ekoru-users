import { PrismaService } from '../prisma/prisma.service';

/**
 * Deletes refresh tokens that expired over a week ago, and returns how many
 * went (GW-7). The gateway adds a row on every sign-in and every refresh, and
 * nothing ever removed one, so the table only grew. An expired token is
 * refused by its signature alone; the week's margin keeps recent ones for
 * reading what happened to a session.
 *
 * RefreshToken is the gateway's table, in the same database and absent from
 * this service's schema, so it is reached with raw SQL. The `ekoru_users` role
 * needs DELETE on it (prisma/db-roles.json in the root).
 */
export function purgeExpiredRefreshTokens(
  prisma: PrismaService,
): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM "RefreshToken"
     WHERE "expiresAt" < NOW() - INTERVAL '7 days'`;
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { resolveIdentity } from './common/identity';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Request, Response } from 'express';
import { PrismaModule } from './prisma/prisma.module';
import { LocationModule } from './location/location.module';
import { SellersModule } from './sellers/sellers.module';
import { AccountModule } from './account/account.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminsModule } from './admins/admins.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { DateTimeScalar, JSONScalar } from './graphql/scalars';
import configuration from './config/configuration';

// Import to register enums
import './graphql/enums';
import { HealthController } from './health/health.controller';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    // Metrics
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),

    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Notification delivery runs off the request path. Backed by this service's
    // own Redis container (redis.{staging,prod}.yml), separate from the
    // transactions one: both run `noeviction`, so a service that fills its
    // Redis starts failing writes, and a payment backlog must not be able to
    // stop notification delivery.
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          // Managed Redis (Azure Cache, Upstash, Redis Cloud) requires TLS.
          // Self-hosted Redis on the private ekoru-net doesn't — leave unset.
          ...(configService.get<string>('REDIS_TLS') === 'true'
            ? { tls: {} }
            : {}),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),

    // GraphQL Federation
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      sortSchema: true,
      playground: process.env.ENVIRONMENT !== 'production',
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
        // Identity from the verified access token, not from the unsigned
        // `x-seller-id` / `x-admin-id` headers. See common/identity.ts.
        ...resolveIdentity(req.headers),
        // Set only by direct server-to-server callers (ekoru-transactions,
        // ekoru-services, the gateway's own clients). The gateway deliberately
        // does NOT attach it to federated requests — doing so made the internal
        // mutations guarded by it callable by any anonymous client.
        internalSecret: req.headers['x-internal-secret'] as string | undefined,
      }),
      formatError: (error) => {
        if (process.env.ENVIRONMENT === 'production') {
          delete error.extensions?.exception;
        }
        return error;
      },
    }),

    // Database
    PrismaModule,

    // Feature modules
    LocationModule,
    SellersModule,
    AccountModule,
    MailModule,
    NotificationsModule,
    AdminsModule,
    SubscriptionModule,
  ],
  controllers: [HealthController],
  providers: [
    DateTimeScalar,
    JSONScalar,
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class AppModule {}

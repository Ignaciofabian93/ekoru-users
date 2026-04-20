import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
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
import { AdminsModule } from './admins/admins.module';
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

    // GraphQL Federation
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
        sellerId: req.headers['x-seller-id'] as string,
        adminId: req.headers['x-admin-id'] as string,
        token: req.headers.authorization?.replace('Bearer ', '') as string,
      }),
      formatError: (error) => {
        if (process.env.NODE_ENV === 'production') {
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
    AdminsModule,
  ],
  controllers: [HealthController],
  providers: [
    DateTimeScalar,
    JSONScalar,
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class AppModule {}

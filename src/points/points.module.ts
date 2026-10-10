import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PointsService } from './points.service';
import { PointsResolver } from './points.resolver';

/**
 * Eco-points: the award engine, levels, labels and the points history
 * (docs/POINTS.md). Sellers (registration) and Account (admin grants) use
 * `PointsService`; other services reach it through `awardActivityPoints`.
 */
@Module({
  imports: [NotificationsModule],
  providers: [PointsService, PointsResolver],
  exports: [PointsService],
})
export class PointsModule {}

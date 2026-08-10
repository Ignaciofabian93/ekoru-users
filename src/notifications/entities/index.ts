import {
  ObjectType,
  Field,
  ID,
  Int,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import {
  DevicePlatform,
  NotificationPriority,
  NotificationType,
} from '@prisma/client';
import { PageInfo } from '../../admins/entities/page-info.entity';

@ObjectType()
export class Notification {
  @Field(() => Int)
  id: number;

  @Field(() => ID)
  sellerId: string;

  @Field(() => NotificationType)
  type: NotificationType;

  @Field()
  title: string;

  @Field()
  message: string;

  @Field()
  isRead: boolean;

  @Field(() => NotificationPriority)
  priority: NotificationPriority;

  @Field({
    nullable: true,
    description: 'Id of the order/deal/message this refers to',
  })
  relatedId?: string;

  @Field({ nullable: true, description: 'Where tapping it should navigate' })
  actionUrl?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  readAt?: Date;
}

@ObjectType()
export class NotificationConnection {
  @Field(() => [Notification])
  nodes: Notification[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType()
export class SellerDevice {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  sellerId: string;

  @Field(() => DevicePlatform)
  platform: DevicePlatform;

  @Field({ nullable: true })
  deviceName?: string;

  @Field()
  isActive: boolean;

  @Field(() => GraphQLISODateTime)
  lastSeenAt: Date;
}

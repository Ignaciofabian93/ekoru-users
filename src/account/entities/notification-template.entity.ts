import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { NotificationType } from '../../graphql/enums';
import { NotificationTemplateTranslation } from './notification-template-translation.entity';

/**
 * Default title/message for each notification type, edited from the admin
 * panel. One row per `NotificationType` (the column is unique); per-language
 * copy lives in `translations`.
 */
@ObjectType()
export class NotificationTemplate {
  @Field(() => Int)
  id: number;

  @Field(() => NotificationType)
  type: NotificationType;

  @Field()
  title: string;

  @Field()
  message: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;

  @Field(() => [NotificationTemplateTranslation], { nullable: true })
  translations?: NotificationTemplateTranslation[];
}

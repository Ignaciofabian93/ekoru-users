import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { DevicePlatform, NotificationType } from '../../graphql/enums';
// This subgraph registers its own `JSON` scalar. Importing the one from
// graphql-type-json would register a second type of the same name and the
// federated schema would refuse to build — same trap as `DateTime`.
import { JSONScalar } from '../../graphql/scalars';

/**
 * The single wire format every domain event uses to reach a user.
 *
 * `data` is deliberately an untyped JSON blob: it fills `{{placeholders}}` in
 * the admin-editable in-app copy *and* carries the richer fields the HTML email
 * templates need, and those differ per `type`. Type safety lives one level up,
 * in the typed client methods each calling service uses
 * (`UsersClient.notifyDealOffer`, `NotificationsClient.sendLoginAlert`, …), so
 * call sites stay checked without this mutation needing a variant per event.
 */
@InputType()
export class EmitNotificationInput {
  @Field(() => ID, { description: 'Who is being notified' })
  @IsNotEmpty()
  sellerId!: string;

  @Field(() => NotificationType)
  @IsEnum(NotificationType)
  type!: NotificationType;

  @Field({
    nullable: true,
    description: 'Id of the order/deal/message this refers to',
  })
  relatedId?: string;

  @Field({ nullable: true, description: 'Where tapping it should navigate' })
  actionUrl?: string;

  @Field(() => JSONScalar, {
    nullable: true,
    description:
      'Payload for template placeholders and email rendering; stored on the notification',
  })
  data?: Record<string, unknown>;
}

@InputType()
export class RegisterDeviceInput {
  @Field({ description: 'Expo push token from the mobile app' })
  @IsNotEmpty()
  @MaxLength(255)
  pushToken!: string;

  @Field(() => DevicePlatform)
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @Field({ nullable: true, description: 'e.g. "Pixel 8" — shown in settings' })
  @MaxLength(120)
  deviceName?: string;
}

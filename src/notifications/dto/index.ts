import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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

  // Every optional field needs a validator, not just the required ones: this
  // subgraph runs ValidationPipe with `forbidNonWhitelisted`, which rejects the
  // whole request with a bare "Bad Request Exception" if a supplied property
  // carries no decorator. See the spec next to this file.
  @Field({
    nullable: true,
    description: 'Id of the order/deal/message this refers to',
  })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @Field({ nullable: true, description: 'Where tapping it should navigate' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @Field(() => JSONScalar, {
    nullable: true,
    description:
      'Payload for template placeholders and email rendering; stored on the notification',
  })
  @IsOptional()
  @IsObject()
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

  // @IsOptional() is required, not decorative: without it @MaxLength runs
  // against `undefined` and rejects every registration that omits the name.
  @Field({ nullable: true, description: 'e.g. "Pixel 8" — shown in settings' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}

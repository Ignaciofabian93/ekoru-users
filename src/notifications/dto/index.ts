import { Field, ID, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsDate,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DevicePlatform, NotificationType } from '../../graphql/enums';
// This subgraph registers its own `JSON` scalar. Importing the one from
// graphql-type-json would register a second type of the same name and the
// federated schema would refuse to build — same trap as `DateTime`.
import { DateTimeScalar, JSONScalar } from '../../graphql/scalars';

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

/**
 * Internal (ekoru-blog-community): confirms a community-event reservation by
 * email. The attendee may be a guest with no account, so this is addressed by
 * email rather than seller id and is not tied to any preference.
 */
@InputType()
export class EventRegistrationEmailInput {
  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(120)
  name!: string;

  @Field(() => String, { description: 'es | en | fr' })
  @IsIn(['es', 'en', 'fr'])
  language!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(200)
  eventTitle!: string;

  @Field(() => DateTimeScalar, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date | null;

  @Field(() => DateTimeScalar, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null;

  @Field(() => String, { nullable: true, description: 'Address, comuna, city' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  place?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  onlineUrl?: string | null;

  @Field(() => String)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  eventUrl!: string;
}

@InputType()
export class EventEmailRecipientInput {
  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(120)
  name!: string;
}

/** Internal (ekoru-blog-community): an event was cancelled; tell everyone registered. */
@InputType()
export class EventCancelledEmailInput {
  @Field(() => String, { description: 'es | en | fr' })
  @IsIn(['es', 'en', 'fr'])
  language!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(200)
  eventTitle!: string;

  @Field(() => DateTimeScalar, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;

  @Field(() => String)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  communityUrl!: string;

  @Field(() => [EventEmailRecipientInput])
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => EventEmailRecipientInput)
  recipients!: EventEmailRecipientInput[];
}

import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  Language,
  TransactionKind,
  NotificationType,
} from '../../graphql/enums';

/**
 * Bulk upsert inputs for the seller gamification tables (labels & levels).
 *
 * Every `*UpsertRowInput` follows the same contract, designed for XLSX
 * round-trips AND single-row edits from the admin panel:
 * - `id` present            → update that row (only the provided fields change)
 * - no `id`, translation row → upsert by its (parentId, language) unique key
 * - no `id`, base row        → create
 *
 * Omitted fields are left untouched on update; explicit `null` clears a
 * nullable column.
 */

// ─── Seller labels ────────────────────────────────────────────────────────────

@InputType()
export class SellerLabelUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Unique canonical name. Required when creating.',
  })
  @IsOptional()
  @IsString()
  labelName?: string;

  @Field(() => TransactionKind, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsEnum(TransactionKind)
  transactionKind?: TransactionKind;

  @Field(() => Int, { nullable: true, description: 'Required when creating.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  transactionsRequired?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  badgeIcon?: string | null;
}

@InputType()
export class SellerLabelTranslationUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id).',
  })
  @IsOptional()
  @IsInt()
  sellerLabelId?: number;

  @Field(() => Language, {
    nullable: true,
    description: 'Required when creating (no id).',
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  labelName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string | null;
}

// ─── Seller levels ────────────────────────────────────────────────────────────

@InputType()
export class SellerLevelUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Unique canonical name. Required when creating.',
  })
  @IsOptional()
  @IsString()
  levelName?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Unique lower points bound. Required when creating.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minPoints?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  maxPoints?: number | null;

  @Field(() => String, {
    nullable: true,
    description: 'JSON text; parsed server-side. Blank leaves it unchanged.',
  })
  @IsOptional()
  @IsString()
  benefits?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  badgeIcon?: string | null;
}

@InputType()
export class SellerLevelTranslationUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id).',
  })
  @IsOptional()
  @IsInt()
  sellerLevelId?: number;

  @Field(() => Language, {
    nullable: true,
    description: 'Required when creating (no id).',
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  levelName?: string;
}

// ─── Notification templates ───────────────────────────────────────────────────

@InputType()
export class NotificationTemplateUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => NotificationType, {
    nullable: true,
    description:
      'Unique key. Required when creating; without an id a matching row is updated.',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class NotificationTemplateTranslationUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id).',
  })
  @IsOptional()
  @IsInt()
  notificationTemplateId?: number;

  @Field(() => Language, {
    nullable: true,
    description: 'Required when creating (no id).',
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  message?: string;
}

// ─── Points by transaction kind ───────────────────────────────────────────────

@InputType()
export class PointsByTransactionKindUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => TransactionKind, {
    nullable: true,
    description:
      'Unique key. Required when creating; without an id a matching row is updated.',
  })
  @IsOptional()
  @IsEnum(TransactionKind)
  transactionKind?: TransactionKind;

  @Field(() => Int, { nullable: true, description: 'Required when creating.' })
  @IsOptional()
  @IsInt()
  pointsAwarded?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string | null;
}

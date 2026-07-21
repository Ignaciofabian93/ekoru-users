import { Field, InputType, Int, Float } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  Language,
  PersonSubscriptionPlan,
  BusinessSubscriptionPlan,
} from '../../graphql/enums';

/**
 * Bulk upsert inputs for the membership tables (person & business). Rows with an
 * `id` update; rows without an `id` create. Translation rows without an id are
 * matched by (membershipId, language); pricing rows by (membershipId, countryId).
 * Omitted fields are left untouched on update.
 */

// ─── Person ───────────────────────────────────────────────────────────────────

@InputType()
export class PersonMembershipUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => PersonSubscriptionPlan, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsEnum(PersonSubscriptionPlan)
  membershipType?: PersonSubscriptionPlan;

  @Field(() => Int, { nullable: true, description: 'Required when creating.' })
  @IsOptional()
  @IsInt()
  durationMonths?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class PersonMembershipTranslationUpsertRowInput {
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
  personMembershipId?: number;

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
  name?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  description?: string[];
}

@InputType()
export class PersonMembershipPricingUpsertRowInput {
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
  personMembershipId?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id).',
  })
  @IsOptional()
  @IsInt()
  countryId?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Business ─────────────────────────────────────────────────────────────────

@InputType()
export class BusinessMembershipUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => BusinessSubscriptionPlan, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsEnum(BusinessSubscriptionPlan)
  membershipType?: BusinessSubscriptionPlan;

  @Field(() => Int, { nullable: true, description: 'Required when creating.' })
  @IsOptional()
  @IsInt()
  durationMonths?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class BusinessMembershipTranslationUpsertRowInput {
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
  businessMembershipId?: number;

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
  name?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  description?: string[];
}

@InputType()
export class BusinessMembershipPricingUpsertRowInput {
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
  businessMembershipId?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id).',
  })
  @IsOptional()
  @IsInt()
  countryId?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Language } from '../../graphql/enums';

/**
 * Bulk upsert inputs for the location tables. Rows with an `id` update; rows
 * without an `id` create (country translation rows without an id are matched by
 * their (countryId, language) pair first). Omitted fields are left untouched.
 */

@InputType()
export class CountryUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'ISO 3166-1 alpha-2 code (e.g. "CL"). Unique.',
  })
  @IsOptional()
  @IsString()
  code?: string | null;
}

@InputType()
export class CountryTranslationUpsertRowInput {
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
  countryId?: number;

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
}

@InputType()
export class RegionUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'Parent country. Required when creating; on update it re-parents the region.',
  })
  @IsOptional()
  @IsInt()
  countryId?: number;
}

@InputType()
export class CityUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'Parent region. Required when creating; on update it re-parents the city.',
  })
  @IsOptional()
  @IsInt()
  regionId?: number;
}

@InputType()
export class CountyUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  county?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'Parent city. Required when creating; on update it re-parents the county.',
  })
  @IsOptional()
  @IsInt()
  cityId?: number;
}

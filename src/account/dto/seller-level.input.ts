import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { Language } from '../../graphql/enums';
import { JSONScalar } from '../../graphql/scalars';

@InputType()
export class CreateSellerLevelInput {
  @Field()
  @IsString()
  levelName: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  minPoints: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxPoints?: number;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  benefits?: any;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  badgeIcon?: string;
}

@InputType()
export class UpdateSellerLevelInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  levelName?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  minPoints?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxPoints?: number;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  benefits?: any;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  badgeIcon?: string;
}

@InputType()
export class UpsertSellerLevelTranslationInput {
  @Field(() => Int)
  @IsInt()
  sellerLevelId: number;

  @Field(() => Language)
  @IsEnum(Language)
  language: Language;

  @Field()
  @IsString()
  levelName: string;
}

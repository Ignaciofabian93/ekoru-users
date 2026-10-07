import { InputType, Field, Int, Float } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

@InputType()
export class UpsertPersonMembershipPricingInput {
  @Field(() => Int)
  @IsInt()
  personMembershipId: number;

  @Field(() => Int)
  @IsInt()
  countryId: number;

  @Field()
  @IsString()
  currency: string;

  @Field(() => Float)
  @IsNumber()
  price: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class UpsertBusinessMembershipPricingInput {
  @Field(() => Int)
  @IsInt()
  businessMembershipId: number;

  @Field(() => Int)
  @IsInt()
  countryId: number;

  @Field()
  @IsString()
  currency: string;

  @Field(() => Float)
  @IsNumber()
  price: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

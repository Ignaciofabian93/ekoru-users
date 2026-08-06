import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

@InputType()
export class AddBusinessAddressInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  label?: string;

  @Field()
  @IsString()
  address: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  reference?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  countryId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  regionId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  cityId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  countyId?: number;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

@InputType()
export class UpdateBusinessAddressInput {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  label?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  address?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  reference?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  countryId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  regionId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  cityId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  countyId?: number;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

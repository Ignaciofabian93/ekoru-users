import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { DateTimeScalar } from '../../graphql/scalars';

@InputType()
export class UpdatePersonProfileInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  firstName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  lastName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  displayName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  bio?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  @IsOptional()
  birthday?: Date;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  profileImage?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  allowExchanges?: boolean;
}

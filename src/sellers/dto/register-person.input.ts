import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { SellerType } from '../../graphql/enums';

@InputType()
export class RegisterPersonInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  password: string;

  @Field()
  @IsString()
  firstName: string;

  @Field()
  @IsString()
  lastName: string;

  // Accepted for parity with RegisterBusinessInput; the service always
  // persists PERSON regardless of the value sent.
  @Field(() => SellerType)
  @IsEnum(SellerType)
  sellerType: SellerType;

  @Field(() => Int, {
    nullable: true,
    description:
      'The terms version (currentTerms.version) the person ticked. Must be the one in force. Left out by app builds from before LEG-1; those accounts are asked at their first visit.',
  })
  @IsOptional()
  @IsInt()
  acceptedTermsVersion?: number;
}

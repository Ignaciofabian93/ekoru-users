import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { SellerType, BusinessType } from '../../graphql/enums';

/** Bounds of the sign-up message a business writes for EKORU's review. */
export const APPLICATION_MESSAGE_MIN_LENGTH = 50;
export const APPLICATION_MESSAGE_MAX_LENGTH = 3000;

@InputType()
export class RegisterBusinessInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(6)
  password: string;

  @Field()
  @IsString()
  businessName: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  displayName?: string;

  @Field(() => SellerType)
  @IsEnum(SellerType)
  sellerType: SellerType;

  @Field(() => BusinessType)
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @Field({
    description:
      'Message to EKORU: what the business does, what it sells and which ' +
      'materials it uses. Emailed to the review inbox; the account stays ' +
      'PENDING (no sign-in) until EKORU approves it.',
  })
  @IsString()
  @MinLength(APPLICATION_MESSAGE_MIN_LENGTH)
  @MaxLength(APPLICATION_MESSAGE_MAX_LENGTH)
  applicationMessage: string;
}

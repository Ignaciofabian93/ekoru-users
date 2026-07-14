import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { SellerType } from '../../graphql/enums';

@InputType()
export class RegisterPersonInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(6)
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
}

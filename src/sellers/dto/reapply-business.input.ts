import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  APPLICATION_MESSAGE_MAX_LENGTH,
  APPLICATION_MESSAGE_MIN_LENGTH,
} from './register-business.input';

/**
 * A rejected business sending EKORU a new application (USR-5). It cannot sign
 * in until it is approved, so the account is identified by its email and
 * password instead of a session.
 */
@InputType()
export class ReapplyBusinessInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;

  @Field({
    description:
      'The new message to EKORU: what changed since the rejection, what the ' +
      'business sells and which materials it uses.',
  })
  @IsString()
  @MinLength(APPLICATION_MESSAGE_MIN_LENGTH)
  @MaxLength(APPLICATION_MESSAGE_MAX_LENGTH)
  applicationMessage: string;
}

import { InputType, Field, Int } from '@nestjs/graphql';
import { IsArray, IsEnum, IsInt, IsString } from 'class-validator';
import { Language } from '../../graphql/enums';

@InputType()
export class UpsertPersonMembershipTranslationInput {
  @Field(() => Int)
  @IsInt()
  personMembershipId: number;

  @Field(() => Language)
  @IsEnum(Language)
  language: Language;

  @Field()
  @IsString()
  name: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  description: string[];
}

@InputType()
export class UpsertBusinessMembershipTranslationInput {
  @Field(() => Int)
  @IsInt()
  businessMembershipId: number;

  @Field(() => Language)
  @IsEnum(Language)
  language: Language;

  @Field()
  @IsString()
  name: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  description: string[];
}

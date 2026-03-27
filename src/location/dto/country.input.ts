import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Language } from '../../graphql/enums';

@InputType()
export class CountryTranslationInput {
  @Field(() => Language)
  @IsEnum(Language)
  language: Language;

  @Field()
  @IsString()
  name: string;
}

@InputType()
export class CreateCountryInput {
  @Field(() => [CountryTranslationInput])
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CountryTranslationInput)
  translations: CountryTranslationInput[];
}

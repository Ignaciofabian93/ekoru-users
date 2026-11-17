import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Language } from '../../graphql/enums';
import { TERMS_CONTENT_MAX } from '../terms-blocks';

@InputType()
export class TermsTextInput {
  @Field(() => Language)
  @IsEnum(Language)
  language: Language;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @Field({
    description:
      'Markdown-lite: "## " clause titles, "### " sub-clauses, "- " items.',
  })
  @IsString()
  @MaxLength(TERMS_CONTENT_MAX)
  content: string;
}

@InputType({
  description:
    'Create the next terms version as a draft (no id) or edit the open draft (id).',
})
export class SaveTermsDraftInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'What changed, shown to people when they are asked to accept.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @Field(() => [TermsTextInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TermsTextInput)
  translations: TermsTextInput[];
}

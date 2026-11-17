import { Field, Int, ObjectType } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { Language } from '../../graphql/enums';
import { TermsBlockKind } from '../terms-blocks';

@ObjectType({ description: 'One piece of a terms text, shown as plain text.' })
export class TermsBlock {
  @Field(() => TermsBlockKind)
  kind: TermsBlockKind;

  @Field()
  text: string;
}

@ObjectType({
  description:
    'The Terms and Policies in force, in one language (LEG-1). Public.',
})
export class TermsDocument {
  @Field(() => Int)
  version: number;

  @Field(() => DateTimeScalar)
  publishedAt: Date;

  @Field(() => Language, {
    description: 'The language served: the one asked for, or Spanish.',
  })
  language: Language;

  @Field()
  title: string;

  @Field(() => String, {
    nullable: true,
    description: 'What changed in this version.',
  })
  summary: string | null;

  @Field(() => [TermsBlock])
  blocks: TermsBlock[];
}

@ObjectType({
  description:
    'Whether the signed-in account has accepted the terms in force (LEG-1).',
})
export class TermsStatus {
  @Field(() => Int, { nullable: true })
  currentVersion: number | null;

  @Field(() => Int, {
    nullable: true,
    description: 'The newest version this account accepted.',
  })
  acceptedVersion: number | null;

  @Field({
    description:
      'True when a version is in force and this account has not accepted it.',
  })
  mustAccept: boolean;

  @Field(() => String, { nullable: true })
  summary: string | null;
}

@ObjectType()
export class TermsVersionText {
  @Field(() => Int)
  id: number;

  @Field(() => Language)
  language: Language;

  @Field()
  title: string;

  @Field({ description: 'Markdown-lite, as stored.' })
  content: string;
}

@ObjectType({ description: 'A terms version as the panel edits it (LEG-1).' })
export class TermsVersionAdmin {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  version: number;

  @Field(() => String, { nullable: true })
  summary: string | null;

  @Field(() => DateTimeScalar, {
    nullable: true,
    description: 'Null while it is a draft.',
  })
  publishedAt: Date | null;

  @Field({ description: 'The published version people must accept now.' })
  isCurrent: boolean;

  @Field(() => Int)
  acceptanceCount: number;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;

  @Field(() => [TermsVersionText])
  translations: TermsVersionText[];
}

import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Region } from './region.entity';
import { DateTimeScalar } from '../../graphql/scalars';
import { CountryTranslation } from './country-translation.entity';

@ObjectType()
export class Country {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  country?: string;

  @Field({
    nullable: true,
    description: 'ISO 3166-1 alpha-2 code (e.g. "CL").',
  })
  code?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;

  @Field(() => [CountryTranslation], { nullable: true })
  translation?: CountryTranslation[];

  @Field(() => [Region], { nullable: true })
  region?: Region[];
}

import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsPositive } from 'class-validator';

@InputType()
export class CreateRegionInput {
  @Field()
  @IsString()
  region: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  countryId: number;
}

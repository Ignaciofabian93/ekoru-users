import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsPositive } from 'class-validator';

@InputType()
export class CreateCountyInput {
  @Field()
  @IsString()
  county: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  cityId: number;
}

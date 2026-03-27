import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsPositive } from 'class-validator';

@InputType()
export class CreateCityInput {
  @Field()
  @IsString()
  city: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  regionId: number;
}

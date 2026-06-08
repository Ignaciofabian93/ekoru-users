import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  MinLength,
} from 'class-validator';
import { BanReason } from '../../graphql/enums';
import { JSONScalar } from '../../graphql/scalars';

@InputType()
export class BanSellerInput {
  @Field(() => BanReason, { defaultValue: BanReason.OTHER })
  @IsEnum(BanReason)
  reasonCode: BanReason = BanReason.OTHER;

  // Human-written explanation. Required so every ban has an auditable rationale.
  @Field()
  @IsString()
  @MinLength(5)
  reason: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  notes?: string;

  // null / omitted = permanent ban.
  @Field(() => Date, { nullable: true })
  @IsDate()
  @IsOptional()
  expiresAt?: Date;

  // Links / screenshots / arbitrary evidence captured at ban time.
  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  evidence?: any;
}

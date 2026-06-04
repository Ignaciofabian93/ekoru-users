import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Language, TransactionKind } from '../../graphql/enums';

@InputType()
export class CreateSellerLabelInput {
  @Field()
  @IsString()
  labelName: string;

  @Field(() => TransactionKind)
  @IsEnum(TransactionKind)
  transactionKind: TransactionKind;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  transactionsRequired: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  badgeIcon?: string;
}

@InputType()
export class UpdateSellerLabelInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  labelName?: string;

  @Field(() => TransactionKind, { nullable: true })
  @IsEnum(TransactionKind)
  @IsOptional()
  transactionKind?: TransactionKind;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  transactionsRequired?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  badgeIcon?: string;
}

@InputType()
export class UpsertSellerLabelTranslationInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  sellerLabelId: number;

  @Field(() => Language)
  @IsEnum(Language)
  language: Language;

  @Field()
  @IsString()
  labelName: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}

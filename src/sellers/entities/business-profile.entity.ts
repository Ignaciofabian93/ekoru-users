import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { BusinessType } from '@prisma/client';
import { DateTimeScalar, JSONScalar } from '../../graphql/scalars';

@ObjectType()
export class BusinessProfile {
  @Field(() => ID)
  id: string;

  @Field()
  sellerId: string;

  @Field()
  businessName: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  logo?: string;

  @Field({ nullable: true })
  coverImage?: string;

  @Field(() => String)
  businessType: BusinessType;

  @Field({ nullable: true })
  legalBusinessName?: string;

  @Field({ nullable: true })
  taxId?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  businessStartDate?: Date;

  @Field({ nullable: true })
  legalRepresentative?: string;

  @Field({ nullable: true })
  legalRepresentativeTaxId?: string;

  @Field({ nullable: true })
  shippingPolicy?: string;

  @Field({ nullable: true })
  returnPolicy?: string;

  @Field({ nullable: true })
  serviceArea?: string;

  @Field(() => Int, { nullable: true })
  yearsOfExperience?: number;

  @Field(() => [String])
  certifications: string[];

  @Field(() => Int, { nullable: true })
  travelRadius?: number;

  @Field(() => JSONScalar, { nullable: true })
  businessHours?: any;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;
}

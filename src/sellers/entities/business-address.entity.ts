import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { Country, Region, City, County } from '../../location/entities';

/**
 * A physical location for a business (HQ, branch, warehouse). A BusinessProfile
 * may have many; at most one is `isPrimary`. The seller's single `Seller.address`
 * remains the primary contact/display address — these are additional locations.
 */
@ObjectType()
export class BusinessAddress {
  @Field(() => Int)
  id: number;

  @Field(() => ID)
  businessProfileId: string;

  @Field({ nullable: true })
  label?: string;

  @Field()
  address: string;

  @Field({ nullable: true })
  reference?: string;

  @Field({ nullable: true })
  zipCode?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  isPrimary: boolean;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;

  @Field(() => Country, { nullable: true })
  country?: Country;

  @Field(() => Region, { nullable: true })
  region?: Region;

  @Field(() => City, { nullable: true })
  city?: City;

  @Field(() => County, { nullable: true })
  county?: County;
}

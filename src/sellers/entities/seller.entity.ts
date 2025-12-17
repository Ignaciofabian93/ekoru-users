import {
  ObjectType,
  Field,
  ID,
  Int,
  Directive,
  createUnionType,
} from '@nestjs/graphql';
import { SellerType, ContactMethod } from '@prisma/client';
import { DateTimeScalar, JSONScalar } from '../../graphql/scalars';
import { Country, Region, City, County } from '../../location/entities';
import { SellerLevel } from './seller-level.entity';
import { SellerPreferences } from './seller-preferences.entity';
import { PersonProfile } from './person-profile.entity';
import { BusinessProfile } from './business-profile.entity';

// Create the Profile union type
export const Profile = createUnionType({
  name: 'Profile',
  types: () => [PersonProfile, BusinessProfile] as const,
  resolveType(value) {
    if ('firstName' in value) {
      return PersonProfile;
    }
    if ('businessName' in value) {
      return BusinessProfile;
    }
    return null;
  },
});

@ObjectType()
@Directive('@key(fields: "id")')
export class Seller {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => String)
  sellerType: SellerType;

  @Field()
  isActive: boolean;

  @Field()
  isVerified: boolean;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  website?: string;

  @Field(() => String, { nullable: true })
  preferredContactMethod?: ContactMethod;

  @Field(() => JSONScalar, { nullable: true })
  socialMediaLinks?: any;

  @Field(() => Int)
  points: number;

  @Field(() => County, { nullable: true })
  county?: County;

  @Field(() => City, { nullable: true })
  city?: City;

  @Field(() => Region, { nullable: true })
  region?: Region;

  @Field(() => Country, { nullable: true })
  country?: Country;

  @Field(() => SellerLevel, { nullable: true })
  sellerLevel?: SellerLevel;

  @Field(() => SellerPreferences, { nullable: true })
  preferences?: SellerPreferences;

  @Field(() => Profile, { nullable: true })
  profile?: typeof Profile;
}

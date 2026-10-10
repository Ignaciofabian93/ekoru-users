import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import {
  BusinessApprovalStatus,
  BusinessType,
  ContactMethod,
  Language,
  SellerType,
} from '../../graphql/enums';
import { PageInfo } from '../../admins/entities/page-info.entity';

/**
 * Sellers exactly as stored, for the panel's spreadsheet round trip
 * (maintenance, bulk edits, backups). Distinct from the federated `Seller`
 * entity: every editable column is here, nothing is derived. JSON columns
 * travel as JSON text. Passwords never leave the server.
 */
@ObjectType()
export class RawPersonProfile {
  @Field()
  firstName: string;
  @Field(() => String, { nullable: true })
  lastName?: string | null;
  @Field(() => String, { nullable: true })
  displayName?: string | null;
  @Field(() => String, { nullable: true })
  bio?: string | null;
  @Field(() => DateTimeScalar, { nullable: true })
  birthday?: Date | null;
  @Field(() => String, { nullable: true })
  profileImage?: string | null;
  @Field(() => String, { nullable: true })
  coverImage?: string | null;
  @Field()
  allowExchanges: boolean;
}

@ObjectType()
export class RawBusinessProfile {
  @Field()
  businessName: string;
  @Field(() => String, { nullable: true })
  description?: string | null;
  @Field(() => String, { nullable: true })
  logo?: string | null;
  @Field(() => String, { nullable: true })
  coverImage?: string | null;
  @Field(() => BusinessType)
  businessType: BusinessType;
  @Field(() => String, { nullable: true })
  legalBusinessName?: string | null;
  @Field(() => String, { nullable: true })
  taxId?: string | null;
  @Field(() => DateTimeScalar, { nullable: true })
  businessStartDate?: Date | null;
  @Field(() => String, { nullable: true })
  legalRepresentative?: string | null;
  @Field(() => String, { nullable: true })
  legalRepresentativeTaxId?: string | null;
  @Field(() => String, { nullable: true })
  shippingPolicy?: string | null;
  @Field(() => String, { nullable: true })
  returnPolicy?: string | null;
  @Field(() => String, { nullable: true })
  serviceArea?: string | null;
  @Field(() => Int, { nullable: true })
  yearsOfExperience?: number | null;
  @Field(() => [String])
  certifications: string[];
  @Field(() => Int, { nullable: true })
  travelRadius?: number | null;
  @Field(() => String, {
    nullable: true,
    description: 'JSON text.',
  })
  businessHours?: string | null;
  @Field(() => BusinessApprovalStatus)
  approvalStatus: BusinessApprovalStatus;
  @Field(() => String, { nullable: true })
  applicationMessage?: string | null;
  @Field(() => DateTimeScalar, { nullable: true })
  reviewedAt?: Date | null;
  @Field(() => String, { nullable: true })
  reviewedById?: string | null;
  @Field(() => String, { nullable: true })
  rejectionReason?: string | null;
}

@ObjectType()
export class RawSellerPreferences {
  @Field()
  enableEmailNotifications: boolean;
  @Field()
  enablePushNotifications: boolean;
  @Field()
  showMySocials: boolean;
  @Field()
  showMyAddress: boolean;
  @Field()
  enableTwoFactorAuth: boolean;
  @Field()
  enableLoginAlerts: boolean;
}

@ObjectType()
export class RawSeller {
  @Field(() => ID)
  id: string;
  @Field()
  email: string;
  @Field(() => SellerType)
  sellerType: SellerType;
  @Field()
  isActive: boolean;
  @Field()
  isVerified: boolean;
  @Field(() => Int)
  points: number;
  @Field(() => Int, { nullable: true })
  sellerLevelId?: number | null;
  @Field(() => String, { nullable: true })
  phone?: string | null;
  @Field(() => String, { nullable: true })
  address?: string | null;
  @Field(() => String, { nullable: true })
  website?: string | null;
  @Field(() => ContactMethod, { nullable: true })
  preferredContactMethod?: ContactMethod | null;
  @Field(() => String, { nullable: true, description: 'JSON text.' })
  socialMediaLinks?: string | null;
  @Field(() => Int, { nullable: true })
  countryId?: number | null;
  @Field(() => Int, { nullable: true })
  regionId?: number | null;
  @Field(() => Int, { nullable: true })
  cityId?: number | null;
  @Field(() => Int, { nullable: true })
  countyId?: number | null;
  @Field(() => Language, { nullable: true })
  contentLanguage?: Language | null;
  @Field(() => DateTimeScalar, { nullable: true })
  lastLoginAt?: Date | null;
  @Field(() => DateTimeScalar)
  createdAt: Date;
  @Field(() => DateTimeScalar)
  updatedAt: Date;
  @Field(() => RawPersonProfile, { nullable: true })
  personProfile?: RawPersonProfile | null;
  @Field(() => RawBusinessProfile, { nullable: true })
  businessProfile?: RawBusinessProfile | null;
  @Field(() => RawSellerPreferences, { nullable: true })
  preferences?: RawSellerPreferences | null;
}

@ObjectType()
export class RawSellerConnection {
  @Field(() => [RawSeller])
  nodes: RawSeller[];
  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

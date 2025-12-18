import { SellerType, ContactMethod, BusinessType } from '../graphql/enums';
import { Country, Region, City, County } from '../location/entities';

// ============================
// Profile Types
// ============================
export type PersonProfile = {
  id: string;
  sellerId: string;
  firstName: string;
  lastName?: string | null;
  displayName?: string | null;
  bio?: string | null;
  birthday?: Date | null;
  profileImage?: string | null;
  coverImage?: string | null;
  allowExchanges: boolean;
  personMembershipId?: number | null;
};

export type BusinessProfile = {
  id: string;
  sellerId: string;
  businessName: string;
  description?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  businessType: BusinessType;
  legalBusinessName?: string | null;
  taxId?: string | null;
  businessStartDate?: Date | null;
  legalRepresentative?: string | null;
  legalRepresentativeTaxId?: string | null;
  shippingPolicy?: string | null;
  returnPolicy?: string | null;
  serviceArea?: string | null;
  yearsOfExperience?: number | null;
  certifications: string[];
  travelRadius?: number | null;
  businessHours?: any;
  businessMembershipId?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================
// Seller Level & Preferences
// ============================
export type SellerLevel = {
  id: number;
  levelName: string;
  minPoints: number;
  maxPoints?: number | null;
  benefits?: any;
  badgeIcon?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SellerPreferences = {
  id: number;
  sellerId: string;
  preferredLanguage?: string | null;
  currency?: string | null;
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  communityUpdates: boolean;
  securityAlerts: boolean;
  weeklySummary: boolean;
  twoFactorAuth: boolean;
};

// ============================
// Seller Type
// ============================
export type Seller = {
  id: string;
  email: string;
  password: string;
  sellerType: SellerType;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  address?: string | null;
  cityId?: number | null;
  countryId?: number | null;
  countyId?: number | null;
  regionId?: number | null;
  phone?: string | null;
  website?: string | null;
  preferredContactMethod?: ContactMethod | null;
  socialMediaLinks?: any;
  points: number;
  sellerLevelId?: number | null;

  // Relations
  personProfile?: PersonProfile | null;
  businessProfile?: BusinessProfile | null;
  city?: City | null;
  country?: Country | null;
  county?: County | null;
  region?: Region | null;
  sellerLevel?: SellerLevel | null;
  sellerPreferences?: SellerPreferences | null;

  // Computed field for union type
  profile?: PersonProfile | BusinessProfile | null;
};

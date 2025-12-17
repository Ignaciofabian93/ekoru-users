export type PersonProfile = {
  id: string;
  sellerId: string;
};

export type BusinessProfile = {
  id: string;
  sellerId: string;
};

export type Seller = {
  id: string;
  email: string;
  sellerType: 'PERSON' | 'STARTUP' | 'COMPANY';
  profile: PersonProfile | BusinessProfile;
  isActive: boolean;
  isVerified: boolean;
};

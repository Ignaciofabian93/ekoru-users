import { registerEnumType } from '@nestjs/graphql';
import {
  AdminRole,
  AdminPermission,
  AdminType,
  SellerType,
  BusinessType,
  ContactMethod,
} from '@prisma/client';

// Register enums for GraphQL
registerEnumType(AdminRole, {
  name: 'AdminRole',
  description: 'Admin role types',
});

registerEnumType(AdminPermission, {
  name: 'AdminPermission',
  description: 'Admin permission types',
});

registerEnumType(AdminType, {
  name: 'AdminType',
  description: 'Admin type (Platform or Business)',
});

registerEnumType(SellerType, {
  name: 'SellerType',
  description: 'Seller type (Person, Startup, Company)',
});

registerEnumType(BusinessType, {
  name: 'BusinessType',
  description: 'Business type (Retail, Services, Mixed)',
});

registerEnumType(ContactMethod, {
  name: 'ContactMethod',
  description: 'Preferred contact method',
});

export {
  AdminRole,
  AdminPermission,
  AdminType,
  SellerType,
  BusinessType,
  ContactMethod,
};

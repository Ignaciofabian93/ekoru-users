import { registerEnumType } from '@nestjs/graphql';

// ============================
// Subscription Plans
// ============================
export enum PersonSubscriptionPlan {
  FREEMIUM = 'FREEMIUM',
  BASIC = 'BASIC',
  ADVANCED = 'ADVANCED',
}

export enum BusinessSubscriptionPlan {
  FREEMIUM = 'FREEMIUM',
  STARTUP = 'STARTUP',
  BASIC = 'BASIC',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

// ============================
// Admin & Permissions
// ============================
export enum AdminType {
  PLATFORM = 'PLATFORM',
  BUSINESS = 'BUSINESS',
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
  CONTENT_MANAGER = 'CONTENT_MANAGER',
  SUPPORT = 'SUPPORT',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  BUSINESS_MANAGER = 'BUSINESS_MANAGER',
  BUSINESS_ANALYST = 'BUSINESS_ANALYST',
  BUSINESS_SUPPORT = 'BUSINESS_SUPPORT',
}

export enum AdminPermission {
  // Product Management
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',
  APPROVE_PRODUCTS = 'APPROVE_PRODUCTS',
  DELETE_PRODUCTS = 'DELETE_PRODUCTS',

  // Content Management
  WRITE_BLOG = 'WRITE_BLOG',
  PUBLISH_BLOG = 'PUBLISH_BLOG',
  DELETE_BLOG = 'DELETE_BLOG',
  MODERATE_CONTENT = 'MODERATE_CONTENT',

  // User Management
  MANAGE_USERS = 'MANAGE_USERS',
  BAN_USERS = 'BAN_USERS',
  VIEW_USER_DATA = 'VIEW_USER_DATA',

  // Order & Transaction Management
  MANAGE_ORDERS = 'MANAGE_ORDERS',
  PROCESS_REFUNDS = 'PROCESS_REFUNDS',
  VIEW_TRANSACTIONS = 'VIEW_TRANSACTIONS',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  EXPORT_DATA = 'EXPORT_DATA',

  // Platform Management (Platform admins only)
  MANAGE_ADMINS = 'MANAGE_ADMINS',
  MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  VIEW_SYSTEM_LOGS = 'VIEW_SYSTEM_LOGS',

  // Business Management (Business admins only)
  MANAGE_BUSINESS_PROFILE = 'MANAGE_BUSINESS_PROFILE',
  MANAGE_BUSINESS_TEAM = 'MANAGE_BUSINESS_TEAM',
  VIEW_BUSINESS_ANALYTICS = 'VIEW_BUSINESS_ANALYTICS',
  MANAGE_BUSINESS_PRODUCTS = 'MANAGE_BUSINESS_PRODUCTS',
  MANAGE_BUSINESS_ORDERS = 'MANAGE_BUSINESS_ORDERS',
}

// ============================
// Seller & Business
// ============================
export enum SellerType {
  PERSON = 'PERSON',
  STARTUP = 'STARTUP',
  COMPANY = 'COMPANY',
}

export enum BusinessType {
  RETAIL = 'RETAIL',
  SERVICES = 'SERVICES',
  MIXED = 'MIXED',
}

// ============================
// Communication & Notifications
// ============================
export enum ContactMethod {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  PHONE = 'PHONE',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  WEBSITE = 'WEBSITE',
  TIKTOK = 'TIKTOK',
}

// ============================
// Register enums for GraphQL
// ============================

// Subscription Plans
registerEnumType(PersonSubscriptionPlan, {
  name: 'PersonSubscriptionPlan',
  description: 'Subscription plan types for individual sellers',
});

registerEnumType(BusinessSubscriptionPlan, {
  name: 'BusinessSubscriptionPlan',
  description: 'Subscription plan types for business sellers',
});

// Admin & Permissions
registerEnumType(AdminType, {
  name: 'AdminType',
  description: 'Admin type (Platform or Business)',
});

registerEnumType(AdminRole, {
  name: 'AdminRole',
  description: 'Admin role types',
});

registerEnumType(AdminPermission, {
  name: 'AdminPermission',
  description: 'Granular permissions for fine-grained access control',
});

// Seller & Business
registerEnumType(SellerType, {
  name: 'SellerType',
  description: 'Seller type (Person, Startup, Company)',
});

registerEnumType(BusinessType, {
  name: 'BusinessType',
  description: 'Business type (Retail, Services, Mixed)',
});

// Communication & Notifications
registerEnumType(ContactMethod, {
  name: 'ContactMethod',
  description: 'Preferred contact methods',
});

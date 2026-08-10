import { registerEnumType } from '@nestjs/graphql';
import {
  DevicePlatform,
  Language,
  NotificationPriority,
  NotificationType,
} from '@prisma/client';

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

export enum BanReason {
  FRAUD = 'FRAUD',
  SCAM = 'SCAM',
  PAYMENT_ABUSE = 'PAYMENT_ABUSE',
  COUNTERFEIT = 'COUNTERFEIT',
  PROHIBITED_ITEMS = 'PROHIBITED_ITEMS',
  HARASSMENT = 'HARASSMENT',
  SPAM = 'SPAM',
  MULTIPLE_ACCOUNTS = 'MULTIPLE_ACCOUNTS',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  CHARGEBACK_ABUSE = 'CHARGEBACK_ABUSE',
  OTHER = 'OTHER',
}

// ============================
// Notification emails
// ============================

/**
 * Coarse lifecycle stage for the transaction email. Deliberately smaller than
 * `OrderStatus` / `P2PStatus` — the calling service maps its own transitions
 * onto these, so buyers get one email per meaningful step rather than one per
 * internal state change.
 */
export enum TransactionEmailStage {
  STARTED = 'STARTED',
  IN_PROCESS = 'IN_PROCESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/** Which side of the transaction the recipient is on. */
export enum TransactionEmailRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
}

/** Mirrors `P2PDealType` in the transactions subgraph. */
export enum DealOfferKind {
  SALE = 'SALE',
  EXCHANGE = 'EXCHANGE',
}

// ============================
// Gamification
// ============================
export enum TransactionKind {
  PURCHASE = 'PURCHASE',
  SELL = 'SELL',
  STOREPURCHASE = 'STOREPURCHASE',
  EXCHANGE = 'EXCHANGE',
  RECYCLE = 'RECYCLE',
  REPAIR = 'REPAIR',
  ATTENDTOWORKSHOP = 'ATTENDTOWORKSHOP',
  ATTENDTOEVENT = 'ATTENDTOEVENT',
  REGISTRATION = 'REGISTRATION',
  BONUS = 'BONUS',
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

/**
 * Notification enums come straight from Prisma rather than being restated
 * here. They were duplicated by hand once and drifted — the local copy was
 * missing values the schema already had — and every consumer only uses them as
 * a GraphQL field type, so one source of truth is strictly better. Same
 * approach as `Language` at the bottom of this file.
 */
export { NotificationType, NotificationPriority, DevicePlatform };

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

registerEnumType(BanReason, {
  name: 'BanReason',
  description: 'Categorised reason a seller account was banned',
});

// Gamification
registerEnumType(TransactionKind, {
  name: 'TransactionKind',
  description: 'Kinds of transactions that can award points or labels',
});

// Notification emails
registerEnumType(TransactionEmailStage, {
  name: 'TransactionEmailStage',
  description: 'Lifecycle stage reported by a transaction notification email',
});

registerEnumType(TransactionEmailRole, {
  name: 'TransactionEmailRole',
  description: 'Side of the transaction the email recipient is on',
});

registerEnumType(DealOfferKind, {
  name: 'DealOfferKind',
  description: 'Whether a proposed deal is a sale or an exchange',
});

// Communication & Notifications
registerEnumType(ContactMethod, {
  name: 'ContactMethod',
  description: 'Preferred contact methods',
});

registerEnumType(NotificationType, {
  name: 'NotificationType',
  description:
    'Kinds of seller notifications (also keys notification templates)',
});

registerEnumType(NotificationPriority, {
  name: 'NotificationPriority',
  description: 'How prominently a notification should be surfaced',
});

registerEnumType(DevicePlatform, {
  name: 'DevicePlatform',
  description: 'Platform of a device registered for push notifications',
});

// Language
export { Language };
registerEnumType(Language, {
  name: 'Language',
  description: 'Supported languages (ES, EN, FR, PT, DE)',
});

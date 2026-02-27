# ekoru-users — GraphQL API Reference

> **Subgraph**: Users & sellers — registration, profiles, location, seller levels, and account management.

---

## Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | Most mutations & authenticated queries | `Bearer <jwt_token>` |
| `x-seller-id` | Authenticated operations | Seller UUID from auth |

---

## Enums

```graphql
enum SellerType {
  PERSON
  STARTUP
  COMPANY
}

enum BusinessType {
  RETAIL
  SERVICES
  MIXED
}

enum ContactMethod {
  EMAIL
  PHONE
  WHATSAPP
  INSTAGRAM
  FACEBOOK
  WEBSITE
  TIKTOK
}
```

---

## Fragments

```graphql
fragment CountryFields on Country {
  id
  country
}

fragment RegionFields on Region {
  id
  region
  countryId
}

fragment CityFields on City {
  id
  city
  regionId
}

fragment CountyFields on County {
  id
  county
  cityId
}

fragment SellerLevelFields on SellerLevel {
  id
  levelName
  minPoints
  maxPoints
  benefits
  badgeIcon
}

fragment SellerPreferencesFields on SellerPreferences {
  id
  preferredLanguage
  currency
  emailNotifications
  pushNotifications
  orderUpdates
  communityUpdates
  securityAlerts
  weeklySummary
  twoFactorAuth
}

fragment PersonProfileFields on PersonProfile {
  id
  firstName
  lastName
  displayName
  bio
  birthday
  profileImage
  coverImage
  allowExchanges
}

fragment BusinessProfileFields on BusinessProfile {
  id
  businessName
  displayName
  description
  logo
  coverImage
  businessType
  legalBusinessName
  taxId
  businessStartDate
  legalRepresentative
  legalRepresentativeTaxId
  shippingPolicy
  returnPolicy
  serviceArea
  yearsOfExperience
  certifications
  travelRadius
  businessHours
}

fragment SellerFields on Seller {
  id
  email
  sellerType
  isActive
  isVerified
  address
  phone
  website
  preferredContactMethod
  socialMediaLinks
  points
  createdAt
  updatedAt
  country { ...CountryFields }
  region { ...RegionFields }
  city { ...CityFields }
  county { ...CountyFields }
  sellerLevel { ...SellerLevelFields }
  preferences { ...SellerPreferencesFields }
}
```

---

## Queries

### countries

```graphql
query GetCountries {
  countries {
    ...CountryFields
  }
}
```

---

### regionsByCountryId

```graphql
query GetRegionsByCountry($countryId: Int!) {
  regionsByCountryId(countryId: $countryId) {
    ...RegionFields
  }
}
```

**Variables**
```json
{ "countryId": 1 }
```

---

### citiesByRegionId

```graphql
query GetCitiesByRegion($regionId: Int!) {
  citiesByRegionId(regionId: $regionId) {
    ...CityFields
  }
}
```

**Variables**
```json
{ "regionId": 5 }
```

---

### countiesByCityId

```graphql
query GetCountiesByCity($cityId: Int!) {
  countiesByCityId(cityId: $cityId) {
    ...CountyFields
  }
}
```

**Variables**
```json
{ "cityId": 12 }
```

---

### me

Returns the currently authenticated seller. Requires `Authorization` header.

```graphql
query Me {
  me {
    ...SellerFields
    profile {
      ... on PersonProfile {
        ...PersonProfileFields
      }
      ... on BusinessProfile {
        ...BusinessProfileFields
      }
    }
  }
}
```

---

### seller

```graphql
query GetSeller($id: String!) {
  seller(id: $id) {
    ...SellerFields
    profile {
      ... on PersonProfile {
        ...PersonProfileFields
      }
      ... on BusinessProfile {
        ...BusinessProfileFields
      }
    }
  }
}
```

**Variables**
```json
{ "id": "seller-uuid-here" }
```

---

### sellers

List sellers with optional filters. Requires `Authorization` header.

```graphql
query GetSellers(
  $sellerType: String
  $isActive: Boolean
  $isVerified: Boolean
  $limit: Int
  $offset: Int
) {
  sellers(
    sellerType: $sellerType
    isActive: $isActive
    isVerified: $isVerified
    limit: $limit
    offset: $offset
  ) {
    ...SellerFields
  }
}
```

**Variables**
```json
{
  "sellerType": "PERSON",
  "isActive": true,
  "isVerified": true,
  "limit": 20,
  "offset": 0
}
```

---

### sellerLevels

```graphql
query GetSellerLevels {
  sellerLevels {
    ...SellerLevelFields
  }
}
```

---

### sellerLevel

```graphql
query GetSellerLevel($id: String!) {
  sellerLevel(id: $id) {
    ...SellerLevelFields
  }
}
```

**Variables**
```json
{ "id": "level-uuid-here" }
```

---

## Mutations

### registerPerson

Register a new individual seller account. No auth required.

```graphql
mutation RegisterPerson($input: RegisterPersonInput!) {
  registerPerson(input: $input) {
    ...SellerFields
    profile {
      ... on PersonProfile {
        ...PersonProfileFields
      }
    }
  }
}
```

**Variables**
```json
{
  "input": {
    "email": "user@example.com",
    "password": "securepassword123",
    "firstName": "Juan",
    "lastName": "Pérez"
  }
}
```

---

### registerBusiness

Register a new business/organization seller account. No auth required.

```graphql
mutation RegisterBusiness($input: RegisterBusinessInput!) {
  registerBusiness(input: $input) {
    ...SellerFields
    profile {
      ... on BusinessProfile {
        ...BusinessProfileFields
      }
    }
  }
}
```

**Variables**
```json
{
  "input": {
    "email": "empresa@example.com",
    "password": "securepassword123",
    "businessName": "Mi Empresa S.A.",
    "displayName": "Mi Empresa",
    "sellerType": "COMPANY",
    "businessType": "RETAIL"
  }
}
```

---

### updateSeller

Update seller's base info (email, address, location, contact). Requires auth.

```graphql
mutation UpdateSeller($input: UpdateSellerInput!) {
  updateSeller(input: $input) {
    ...SellerFields
  }
}
```

**Variables**
```json
{
  "input": {
    "address": "Av. Providencia 1234",
    "phone": "+56912345678",
    "cityId": 12,
    "regionId": 5,
    "countryId": 1,
    "preferredContactMethod": "WHATSAPP",
    "socialMediaLinks": { "instagram": "@mitienda" }
  }
}
```

---

### updatePersonProfile

Update personal profile fields. Requires auth.

```graphql
mutation UpdatePersonProfile($input: UpdatePersonProfileInput!) {
  updatePersonProfile(input: $input) {
    ...PersonProfileFields
  }
}
```

**Variables**
```json
{
  "input": {
    "firstName": "Juan",
    "lastName": "Pérez",
    "displayName": "Juanito",
    "bio": "Vendedor apasionado de tecnología",
    "profileImage": "https://cdn.example.com/avatar.jpg",
    "allowExchanges": true
  }
}
```

---

### updateBusinessProfile

Update business profile fields. Requires auth.

```graphql
mutation UpdateBusinessProfile($input: UpdateBusinessProfileInput!) {
  updateBusinessProfile(input: $input) {
    ...BusinessProfileFields
  }
}
```

**Variables**
```json
{
  "input": {
    "businessName": "Tech Store Chile",
    "description": "Tu tienda de tecnología de confianza",
    "logo": "https://cdn.example.com/logo.png",
    "businessType": "SERVICES",
    "shippingPolicy": "Envíos en 24-48 horas",
    "returnPolicy": "Devoluciones en 30 días",
    "yearsOfExperience": 5
  }
}
```

---

### updateSellerPreferences

Update notification and account preferences. Requires auth.

```graphql
mutation UpdateSellerPreferences($input: UpdateSellerPreferencesInput!) {
  updateSellerPreferences(input: $input) {
    ...SellerPreferencesFields
  }
}
```

**Variables**
```json
{
  "input": {
    "preferredLanguage": "es",
    "currency": "CLP",
    "emailNotifications": true,
    "pushNotifications": true,
    "orderUpdates": true,
    "communityUpdates": false,
    "securityAlerts": true,
    "weeklySummary": true,
    "twoFactorAuth": false
  }
}
```

---

### updatePassword

Change the current seller's password. Requires auth.

```graphql
mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
  updatePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
    id
    email
  }
}
```

**Variables**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

---

### requestPasswordReset

Send a password reset email. No auth required.

```graphql
mutation RequestPasswordReset($email: String!) {
  requestPasswordReset(email: $email)
}
```

**Variables**
```json
{ "email": "user@example.com" }
```

---

### deactivateAccount

Deactivate the current seller's account. Requires auth.

```graphql
mutation DeactivateAccount {
  deactivateAccount {
    id
    isActive
  }
}
```

---

### reactivateAccount

Reactivate the current seller's account. Requires auth.

```graphql
mutation ReactivateAccount {
  reactivateAccount {
    id
    isActive
  }
}
```

---

### addPoints

Add loyalty points to a seller. Requires auth (admin action).

```graphql
mutation AddPoints($id: String!, $points: Int!) {
  addPoints(id: $id, points: $points) {
    id
    points
  }
}
```

**Variables**
```json
{ "id": "seller-uuid-here", "points": 100 }
```

---

### deductPoints

Deduct loyalty points from a seller. Requires auth (admin action).

```graphql
mutation DeductPoints($id: String!, $points: Int!) {
  deductPoints(id: $id, points: $points) {
    id
    points
  }
}
```

**Variables**
```json
{ "id": "seller-uuid-here", "points": 50 }
```

---

### updateSellerCategory

Assign a seller to a category. Requires auth (admin action).

```graphql
mutation UpdateSellerCategory($id: String!, $categoryId: Int!) {
  updateSellerCategory(id: $id, categoryId: $categoryId) {
    id
    sellerLevel { ...SellerLevelFields }
  }
}
```

**Variables**
```json
{ "id": "seller-uuid-here", "categoryId": 3 }
```

---

## Input Types

### RegisterPersonInput

```graphql
input RegisterPersonInput {
  email: String!        # Valid email address
  password: String!     # Min 6 characters
  firstName: String!
  lastName: String!
}
```

### RegisterBusinessInput

```graphql
input RegisterBusinessInput {
  email: String!
  password: String!     # Min 6 characters
  businessName: String!
  displayName: String
  sellerType: String!   # STARTUP | COMPANY
  businessType: String! # RETAIL | SERVICES | MIXED
}
```

### UpdateSellerInput

```graphql
input UpdateSellerInput {
  email: String
  address: String
  cityId: Int
  countyId: Int
  regionId: Int
  countryId: Int
  phone: String
  website: String
  preferredContactMethod: String  # EMAIL | PHONE | WHATSAPP | INSTAGRAM | FACEBOOK | WEBSITE | TIKTOK
  socialMediaLinks: JSON
}
```

### UpdatePersonProfileInput

```graphql
input UpdatePersonProfileInput {
  firstName: String
  lastName: String
  displayName: String
  bio: String
  birthday: DateTime
  profileImage: String
  coverImage: String
  allowExchanges: Boolean
}
```

### UpdateBusinessProfileInput

```graphql
input UpdateBusinessProfileInput {
  businessName: String
  description: String
  logo: String
  coverImage: String
  businessType: String
  legalBusinessName: String
  taxId: String
  businessStartDate: DateTime
  legalRepresentative: String
  legalRepresentativeTaxId: String
  shippingPolicy: String
  returnPolicy: String
  serviceArea: String
  yearsOfExperience: Int
  certifications: [String!]
  travelRadius: Int
  businessHours: JSON
}
```

### UpdateSellerPreferencesInput

```graphql
input UpdateSellerPreferencesInput {
  preferredLanguage: String
  currency: String
  emailNotifications: Boolean
  pushNotifications: Boolean
  orderUpdates: Boolean
  communityUpdates: Boolean
  securityAlerts: Boolean
  weeklySummary: Boolean
  twoFactorAuth: Boolean
}
```

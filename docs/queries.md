# Ekoru Users Subgraph - API Documentation

This document describes all available GraphQL queries and mutations in the `ekoru-users` subgraph and how to use them in a web application.

## Table of Contents

- [Authentication](#authentication)
- [Queries](#queries)
  - [Seller Queries](#seller-queries)
  - [Location Queries](#location-queries)
- [Mutations](#mutations)
  - [Registration](#registration)
  - [Profile Updates](#profile-updates)
  - [Account Management](#account-management)
- [Types and Enums](#types-and-enums)

---

## Authentication

Most queries and mutations require authentication. The service uses the `@CurrentSeller()` decorator which extracts the seller ID from the authentication context. Make sure to include authentication headers in your requests:

```typescript
// Example using Apollo Client
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'http://your-gateway-url/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

---

## Queries

### Seller Queries

#### 1. Get All Sellers

Retrieve a list of sellers with optional filters.

**Query Name:** `sellers`

**Parameters:**

- `sellerType` (String, optional): Filter by seller type (`PERSON`, `STARTUP`, `COMPANY`)
- `isActive` (Boolean, optional): Filter by active status
- `isVerified` (Boolean, optional): Filter by verification status
- `limit` (Int, optional): Number of results to return
- `offset` (Int, optional): Number of results to skip (pagination)

**Returns:** `[Seller!]!`

**Example:**

```graphql
query GetSellers(
  $sellerType: String
  $isActive: Boolean
  $limit: Int
  $offset: Int
) {
  sellers(
    sellerType: $sellerType
    isActive: $isActive
    limit: $limit
    offset: $offset
  ) {
    id
    email
    sellerType
    isActive
    isVerified
    points
    profile {
      ... on PersonProfile {
        firstName
        lastName
        displayName
        bio
      }
      ... on BusinessProfile {
        businessName
        description
        logo
      }
    }
    country {
      id
      name
    }
    sellerLevel {
      id
      levelName
    }
  }
}
```

**Web App Usage (React + Apollo):**

```typescript
import { gql, useQuery } from '@apollo/client';

const GET_SELLERS = gql`
  query GetSellers($sellerType: String, $limit: Int, $offset: Int) {
    sellers(sellerType: $sellerType, limit: $limit, offset: $offset) {
      id
      email
      sellerType
      profile {
        ... on PersonProfile {
          firstName
          lastName
        }
        ... on BusinessProfile {
          businessName
        }
      }
    }
  }
`;

function SellersList() {
  const { data, loading, error } = useQuery(GET_SELLERS, {
    variables: {
      sellerType: 'PERSON',
      limit: 10,
      offset: 0
    }
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.sellers.map(seller => (
        <div key={seller.id}>
          <h3>{seller.profile?.firstName || seller.profile?.businessName}</h3>
          <p>{seller.email}</p>
        </div>
      ))}
    </div>
  );
}
```

---

#### 2. Get Seller by ID

Retrieve a specific seller by their ID.

**Query Name:** `seller`

**Parameters:**

- `id` (String!, required): The seller's ID

**Returns:** `Seller`

**Example:**

```graphql
query GetSeller($id: String!) {
  seller(id: $id) {
    id
    email
    sellerType
    isActive
    isVerified
    points
    address
    phone
    website
    profile {
      ... on PersonProfile {
        firstName
        lastName
        displayName
        bio
        birthday
        profileImage
        coverImage
        allowExchanges
      }
      ... on BusinessProfile {
        businessName
        description
        logo
        coverImage
        businessType
        legalBusinessName
        taxId
        businessStartDate
      }
    }
    country {
      id
      name
    }
    region {
      id
      name
    }
    city {
      id
      name
    }
    county {
      id
      name
    }
    sellerLevel {
      id
      levelName
      description
    }
    preferences {
      theme
      language
      notifications
    }
  }
}
```

**Web App Usage:**

```typescript
import { gql, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';

const GET_SELLER = gql`
  query GetSeller($id: String!) {
    seller(id: $id) {
      id
      email
      profile {
        ... on PersonProfile {
          firstName
          lastName
          bio
        }
        ... on BusinessProfile {
          businessName
          description
        }
      }
    }
  }
`;

function SellerProfile() {
  const { id } = useParams();
  const { data, loading, error } = useQuery(GET_SELLER, {
    variables: { id }
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1>{data.seller.profile?.firstName || data.seller.profile?.businessName}</h1>
      <p>{data.seller.email}</p>
    </div>
  );
}
```

---

#### 3. Get Current User (Me)

Retrieve the authenticated user's profile.

**Query Name:** `me`

**Parameters:** None (uses authentication context)

**Returns:** `Seller`

**Example:**

```graphql
query GetMe {
  me {
    id
    email
    sellerType
    isActive
    isVerified
    points
    profile {
      ... on PersonProfile {
        firstName
        lastName
        displayName
        bio
        birthday
        profileImage
        coverImage
      }
      ... on BusinessProfile {
        businessName
        description
        logo
        coverImage
        businessType
      }
    }
    country {
      id
      name
    }
    sellerLevel {
      id
      levelName
    }
    preferences {
      theme
      language
    }
  }
}
```

**Web App Usage:**

```typescript
import { gql, useQuery } from '@apollo/client';

const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      sellerType
      profile {
        ... on PersonProfile {
          firstName
          lastName
        }
        ... on BusinessProfile {
          businessName
        }
      }
    }
  }
`;

function UserProfile() {
  const { data, loading, error } = useQuery(GET_ME);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Please log in</p>;

  return (
    <div>
      <h1>Welcome, {data.me.profile?.firstName || data.me.profile?.businessName}!</h1>
      <p>{data.me.email}</p>
    </div>
  );
}
```

---

#### 4. Get Seller Levels

Retrieve all available seller levels.

**Query Name:** `sellerLevels`

**Parameters:** None

**Returns:** `[SellerLevel!]!`

**Example:**

```graphql
query GetSellerLevels {
  sellerLevels {
    id
    levelName
    description
  }
}
```

**Web App Usage:**

```typescript
const GET_SELLER_LEVELS = gql`
  query GetSellerLevels {
    sellerLevels {
      id
      levelName
      description
    }
  }
`;

function LevelSelector() {
  const { data, loading } = useQuery(GET_SELLER_LEVELS);

  if (loading) return <p>Loading...</p>;

  return (
    <select>
      {data.sellerLevels.map(level => (
        <option key={level.id} value={level.id}>
          {level.levelName}
        </option>
      ))}
    </select>
  );
}
```

---

#### 5. Get Seller Level by ID

Retrieve a specific seller level by ID.

**Query Name:** `sellerLevel`

**Parameters:**

- `id` (String!, required): The level ID

**Returns:** `SellerLevel`

**Example:**

```graphql
query GetSellerLevel($id: String!) {
  sellerLevel(id: $id) {
    id
    levelName
    description
  }
}
```

---

### Location Queries

#### 6. Get Countries

Retrieve all available countries.

**Query Name:** `countries`

**Parameters:** None

**Returns:** `[Country!]!`

**Example:**

```graphql
query GetCountries {
  countries {
    id
    name
    code
  }
}
```

**Web App Usage:**

```typescript
const GET_COUNTRIES = gql`
  query GetCountries {
    countries {
      id
      name
      code
    }
  }
`;

function CountrySelector() {
  const { data, loading } = useQuery(GET_COUNTRIES);

  if (loading) return <p>Loading...</p>;

  return (
    <select name="country">
      {data.countries.map(country => (
        <option key={country.id} value={country.id}>
          {country.name}
        </option>
      ))}
    </select>
  );
}
```

---

#### 7. Get Regions by Country

Retrieve regions for a specific country.

**Query Name:** `regionsByCountryId`

**Parameters:**

- `countryId` (Int!, required): The country ID

**Returns:** `[Region!]!`

**Example:**

```graphql
query GetRegionsByCountry($countryId: Int!) {
  regionsByCountryId(countryId: $countryId) {
    id
    name
    countryId
  }
}
```

**Web App Usage:**

```typescript
const GET_REGIONS = gql`
  query GetRegions($countryId: Int!) {
    regionsByCountryId(countryId: $countryId) {
      id
      name
    }
  }
`;

function RegionSelector({ countryId }) {
  const { data, loading } = useQuery(GET_REGIONS, {
    variables: { countryId: parseInt(countryId) },
    skip: !countryId
  });

  if (!countryId) return null;
  if (loading) return <p>Loading regions...</p>;

  return (
    <select name="region">
      {data.regionsByCountryId.map(region => (
        <option key={region.id} value={region.id}>
          {region.name}
        </option>
      ))}
    </select>
  );
}
```

---

#### 8. Get Cities by Region

Retrieve cities for a specific region.

**Query Name:** `citiesByRegionId`

**Parameters:**

- `regionId` (Int!, required): The region ID

**Returns:** `[City!]!`

**Example:**

```graphql
query GetCitiesByRegion($regionId: Int!) {
  citiesByRegionId(regionId: $regionId) {
    id
    name
    regionId
  }
}
```

---

#### 9. Get Counties by City

Retrieve counties/communes for a specific city.

**Query Name:** `countiesByCityId`

**Parameters:**

- `cityId` (Int!, required): The city ID

**Returns:** `[County!]!`

**Example:**

```graphql
query GetCountiesByCity($cityId: Int!) {
  countiesByCityId(cityId: $cityId) {
    id
    name
    cityId
  }
}
```

---

## Mutations

### Registration

#### 10. Register Person

Register a new personal account.

**Mutation Name:** `registerPerson`

**Input Fields:**

- `email` (String!, required): User's email address
- `password` (String!, required): Password (min 6 characters)
- `firstName` (String!, required): First name
- `lastName` (String!, required): Last name

**Returns:** `Seller!`

**Example:**

```graphql
mutation RegisterPerson($input: RegisterPersonInput!) {
  registerPerson(input: $input) {
    id
    email
    sellerType
    profile {
      ... on PersonProfile {
        firstName
        lastName
      }
    }
  }
}
```

**Web App Usage:**

```typescript
import { gql, useMutation } from '@apollo/client';

const REGISTER_PERSON = gql`
  mutation RegisterPerson($input: RegisterPersonInput!) {
    registerPerson(input: $input) {
      id
      email
      profile {
        ... on PersonProfile {
          firstName
          lastName
        }
      }
    }
  }
`;

function RegisterForm() {
  const [registerPerson, { loading, error }] = useMutation(REGISTER_PERSON);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const { data } = await registerPerson({
        variables: {
          input: {
            email: formData.get('email'),
            password: formData.get('password'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName')
          }
        }
      });

      console.log('User registered:', data.registerPerson);
      // Redirect to login or auto-login
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <input name="firstName" placeholder="First Name" required />
      <input name="lastName" placeholder="Last Name" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

---

#### 11. Register Business

Register a new business account (startup or company).

**Mutation Name:** `registerBusiness`

**Input Fields:**

- `email` (String!, required): Business email address
- `password` (String!, required): Password (min 6 characters)
- `businessName` (String!, required): Business name
- `displayName` (String, optional): Display name
- `sellerType` (SellerType!, required): `STARTUP` or `COMPANY`
- `businessType` (BusinessType!, required): `RETAIL`, `SERVICES`, or `MIXED`

**Returns:** `Seller!`

**Example:**

```graphql
mutation RegisterBusiness($input: RegisterBusinessInput!) {
  registerBusiness(input: $input) {
    id
    email
    sellerType
    profile {
      ... on BusinessProfile {
        businessName
        businessType
      }
    }
  }
}
```

**Web App Usage:**

```typescript
const REGISTER_BUSINESS = gql`
  mutation RegisterBusiness($input: RegisterBusinessInput!) {
    registerBusiness(input: $input) {
      id
      email
      profile {
        ... on BusinessProfile {
          businessName
          businessType
        }
      }
    }
  }
`;

function BusinessRegisterForm() {
  const [registerBusiness, { loading, error }] = useMutation(REGISTER_BUSINESS);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await registerBusiness({
        variables: {
          input: {
            email: formData.get('email'),
            password: formData.get('password'),
            businessName: formData.get('businessName'),
            sellerType: formData.get('sellerType'),
            businessType: formData.get('businessType')
          }
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Business Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <input name="businessName" placeholder="Business Name" required />
      <select name="sellerType" required>
        <option value="">Select Type</option>
        <option value="STARTUP">Startup</option>
        <option value="COMPANY">Company</option>
      </select>
      <select name="businessType" required>
        <option value="">Select Business Type</option>
        <option value="RETAIL">Retail</option>
        <option value="SERVICES">Services</option>
        <option value="MIXED">Mixed</option>
      </select>
      <button type="submit" disabled={loading}>Register Business</button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

---

### Profile Updates

#### 12. Update Seller

Update general seller information (location, contact, etc.).

**Mutation Name:** `updateSeller`

**Input Fields (all optional):**

- `email` (String)
- `address` (String)
- `cityId` (Int)
- `countyId` (Int)
- `regionId` (Int)
- `countryId` (Int)
- `phone` (String)
- `website` (String)
- `contactMethod` (ContactMethod): `EMAIL`, `WHATSAPP`, `PHONE`, etc.
- `socialMedia` (JSON)

**Returns:** `Seller!`

**Example:**

```graphql
mutation UpdateSeller($input: UpdateSellerInput!) {
  updateSeller(input: $input) {
    id
    email
    address
    phone
    website
    country {
      name
    }
    city {
      name
    }
  }
}
```

**Web App Usage:**

```typescript
const UPDATE_SELLER = gql`
  mutation UpdateSeller($input: UpdateSellerInput!) {
    updateSeller(input: $input) {
      id
      address
      phone
      website
    }
  }
`;

function UpdateContactInfo() {
  const [updateSeller, { loading }] = useMutation(UPDATE_SELLER);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    await updateSeller({
      variables: {
        input: {
          address: formData.get('address'),
          phone: formData.get('phone'),
          website: formData.get('website'),
          countryId: parseInt(formData.get('countryId')),
          cityId: parseInt(formData.get('cityId'))
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="address" placeholder="Address" />
      <input name="phone" placeholder="Phone" />
      <input name="website" placeholder="Website" />
      {/* Country and city selectors */}
      <button type="submit" disabled={loading}>Update</button>
    </form>
  );
}
```

---

#### 13. Update Person Profile

Update personal profile information.

**Mutation Name:** `updatePersonProfile`

**Input Fields (all optional):**

- `firstName` (String)
- `lastName` (String)
- `displayName` (String)
- `bio` (String)
- `birthday` (DateTime)
- `profileImage` (String)
- `coverImage` (String)
- `allowExchanges` (Boolean)

**Returns:** `PersonProfile!`

**Example:**

```graphql
mutation UpdatePersonProfile($input: UpdatePersonProfileInput!) {
  updatePersonProfile(input: $input) {
    firstName
    lastName
    displayName
    bio
    profileImage
  }
}
```

**Web App Usage:**

```typescript
const UPDATE_PERSON_PROFILE = gql`
  mutation UpdatePersonProfile($input: UpdatePersonProfileInput!) {
    updatePersonProfile(input: $input) {
      firstName
      lastName
      bio
      profileImage
    }
  }
`;

function EditPersonProfile() {
  const [updateProfile, { loading }] = useMutation(UPDATE_PERSON_PROFILE);

  const handleSubmit = async (data) => {
    await updateProfile({
      variables: {
        input: {
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio,
          birthday: data.birthday
        }
      }
    });
  };

  return (
    // Your form component
    <ProfileForm onSubmit={handleSubmit} loading={loading} />
  );
}
```

---

#### 14. Update Business Profile

Update business profile information.

**Mutation Name:** `updateBusinessProfile`

**Input Fields (all optional):**

- `businessName` (String)
- `description` (String)
- `logo` (String)
- `coverImage` (String)
- `businessType` (BusinessType)
- `legalBusinessName` (String)
- `taxId` (String)
- `businessStartDate` (DateTime)
- `legalRepresentative` (String)
- And more...

**Returns:** `BusinessProfile!`

**Example:**

```graphql
mutation UpdateBusinessProfile($input: UpdateBusinessProfileInput!) {
  updateBusinessProfile(input: $input) {
    businessName
    description
    logo
    businessType
  }
}
```

---

#### 15. Update Seller Preferences

Update user preferences (theme, language, notifications, etc.).

**Mutation Name:** `updateSellerPreferences`

**Input Fields (all optional):**

- `theme` (String)
- `language` (String)
- `notifications` (JSON)

**Returns:** `SellerPreferences!`

**Example:**

```graphql
mutation UpdatePreferences($input: UpdateSellerPreferencesInput!) {
  updateSellerPreferences(input: $input) {
    theme
    language
    notifications
  }
}
```

**Web App Usage:**

```typescript
const UPDATE_PREFERENCES = gql`
  mutation UpdatePreferences($input: UpdateSellerPreferencesInput!) {
    updateSellerPreferences(input: $input) {
      theme
      language
    }
  }
`;

function PreferencesSettings() {
  const [updatePreferences] = useMutation(UPDATE_PREFERENCES);

  const handleThemeChange = async (theme) => {
    await updatePreferences({
      variables: {
        input: { theme }
      }
    });
  };

  return (
    <div>
      <button onClick={() => handleThemeChange('DARK')}>Dark Mode</button>
      <button onClick={() => handleThemeChange('LIGHT')}>Light Mode</button>
    </div>
  );
}
```

---

### Account Management

#### 16. Update Password

Change the user's password.

**Mutation Name:** `updatePassword`

**Parameters:**

- `currentPassword` (String!, required): Current password
- `newPassword` (String!, required): New password

**Returns:** `Seller!`

**Example:**

```graphql
mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
  updatePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
    id
    email
  }
}
```

**Web App Usage:**

```typescript
const UPDATE_PASSWORD = gql`
  mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
    updatePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      id
    }
  }
`;

function ChangePasswordForm() {
  const [updatePassword, { loading, error }] = useMutation(UPDATE_PASSWORD);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await updatePassword({
        variables: {
          currentPassword: formData.get('currentPassword'),
          newPassword: formData.get('newPassword')
        }
      });
      alert('Password updated successfully!');
    } catch (err) {
      console.error('Error updating password:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="currentPassword" type="password" placeholder="Current Password" required />
      <input name="newPassword" type="password" placeholder="New Password" required />
      <button type="submit" disabled={loading}>Update Password</button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

---

#### 17. Request Password Reset

Request a password reset email.

**Mutation Name:** `requestPasswordReset`

**Parameters:**

- `email` (String!, required): User's email address

**Returns:** `Boolean!`

**Example:**

```graphql
mutation RequestPasswordReset($email: String!) {
  requestPasswordReset(email: $email)
}
```

**Web App Usage:**

```typescript
const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

function ForgotPasswordForm() {
  const [requestReset, { loading, data }] = useMutation(REQUEST_PASSWORD_RESET);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;

    await requestReset({
      variables: { email }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Your email" required />
      <button type="submit" disabled={loading}>Send Reset Link</button>
      {data?.requestPasswordReset && <p>Reset link sent to your email!</p>}
    </form>
  );
}
```

---

#### 18. Deactivate Account

Deactivate the current user's account.

**Mutation Name:** `deactivateAccount`

**Parameters:** None (uses authentication context)

**Returns:** `Seller!`

**Example:**

```graphql
mutation DeactivateAccount {
  deactivateAccount {
    id
    isActive
  }
}
```

**Web App Usage:**

```typescript
const DEACTIVATE_ACCOUNT = gql`
  mutation DeactivateAccount {
    deactivateAccount {
      id
      isActive
    }
  }
`;

function DeactivateButton() {
  const [deactivate, { loading }] = useMutation(DEACTIVATE_ACCOUNT);

  const handleDeactivate = async () => {
    if (window.confirm('Are you sure you want to deactivate your account?')) {
      await deactivate();
      // Logout user
    }
  };

  return (
    <button onClick={handleDeactivate} disabled={loading}>
      Deactivate Account
    </button>
  );
}
```

---

#### 19. Reactivate Account

Reactivate a deactivated account.

**Mutation Name:** `reactivateAccount`

**Parameters:** None (uses authentication context)

**Returns:** `Seller!`

**Example:**

```graphql
mutation ReactivateAccount {
  reactivateAccount {
    id
    isActive
  }
}
```

---

#### 20. Add Points (Admin)

Add points to a seller's account. Requires admin privileges.

**Mutation Name:** `addPoints`

**Parameters:**

- `id` (String!, required): Target seller ID
- `points` (Int!, required): Number of points to add

**Returns:** `Seller!`

**Example:**

```graphql
mutation AddPoints($id: String!, $points: Int!) {
  addPoints(id: $id, points: $points) {
    id
    points
  }
}
```

---

#### 21. Deduct Points (Admin)

Deduct points from a seller's account. Requires admin privileges.

**Mutation Name:** `deductPoints`

**Parameters:**

- `id` (String!, required): Target seller ID
- `points` (Int!, required): Number of points to deduct

**Returns:** `Seller!`

**Example:**

```graphql
mutation DeductPoints($id: String!, $points: Int!) {
  deductPoints(id: $id, points: $points) {
    id
    points
  }
}
```

---

#### 22. Update Seller Category (Admin)

Update a seller's category/level. Requires admin privileges.

**Mutation Name:** `updateSellerCategory`

**Parameters:**

- `id` (String!, required): Target seller ID
- `categoryId` (Int!, required): New category/level ID

**Returns:** `Seller!`

**Example:**

```graphql
mutation UpdateSellerCategory($id: String!, $categoryId: Int!) {
  updateSellerCategory(id: $id, categoryId: $categoryId) {
    id
    sellerLevel {
      id
      levelName
    }
  }
}
```

---

## Types and Enums

### SellerType Enum

```typescript
enum SellerType {
  PERSON = 'PERSON'
  STARTUP = 'STARTUP'
  COMPANY = 'COMPANY'
}
```

### BusinessType Enum

```typescript
enum BusinessType {
  RETAIL = 'RETAIL'
  SERVICES = 'SERVICES'
  MIXED = 'MIXED'
}
```

### ContactMethod Enum

```typescript
enum ContactMethod {
  EMAIL = 'EMAIL'
  WHATSAPP = 'WHATSAPP'
  PHONE = 'PHONE'
  INSTAGRAM = 'INSTAGRAM'
  FACEBOOK = 'FACEBOOK'
  WEBSITE = 'WEBSITE'
  TIKTOK = 'TIKTOK'
}
```

---

## Complete Example: Location Cascade Form

Here's a complete example of implementing a cascading location selector:

```typescript
import { gql, useQuery } from '@apollo/client';
import { useState } from 'react';

const GET_COUNTRIES = gql`
  query GetCountries {
    countries {
      id
      name
    }
  }
`;

const GET_REGIONS = gql`
  query GetRegions($countryId: Int!) {
    regionsByCountryId(countryId: $countryId) {
      id
      name
    }
  }
`;

const GET_CITIES = gql`
  query GetCities($regionId: Int!) {
    citiesByRegionId(regionId: $regionId) {
      id
      name
    }
  }
`;

const GET_COUNTIES = gql`
  query GetCounties($cityId: Int!) {
    countiesByCityId(cityId: $cityId) {
      id
      name
    }
  }
`;

function LocationSelector({ onChange }) {
  const [countryId, setCountryId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [cityId, setCityId] = useState('');

  const { data: countriesData } = useQuery(GET_COUNTRIES);
  const { data: regionsData } = useQuery(GET_REGIONS, {
    variables: { countryId: parseInt(countryId) },
    skip: !countryId
  });
  const { data: citiesData } = useQuery(GET_CITIES, {
    variables: { regionId: parseInt(regionId) },
    skip: !regionId
  });
  const { data: countiesData } = useQuery(GET_COUNTIES, {
    variables: { cityId: parseInt(cityId) },
    skip: !cityId
  });

  return (
    <div>
      <select
        value={countryId}
        onChange={(e) => {
          setCountryId(e.target.value);
          setRegionId('');
          setCityId('');
        }}
      >
        <option value="">Select Country</option>
        {countriesData?.countries.map(country => (
          <option key={country.id} value={country.id}>
            {country.name}
          </option>
        ))}
      </select>

      {countryId && (
        <select
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value);
            setCityId('');
          }}
        >
          <option value="">Select Region</option>
          {regionsData?.regionsByCountryId.map(region => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
      )}

      {regionId && (
        <select value={cityId} onChange={(e) => setCityId(e.target.value)}>
          <option value="">Select City</option>
          {citiesData?.citiesByRegionId.map(city => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      )}

      {cityId && (
        <select onChange={(e) => onChange(e.target.value)}>
          <option value="">Select County</option>
          {countiesData?.countiesByCityId.map(county => (
            <option key={county.id} value={county.id}>
              {county.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

---

## Error Handling

All mutations and queries may throw the following errors:

- `UnAuthorizedError`: When authentication is required but not provided
- `BadRequestError`: When input validation fails
- `NotFoundError`: When a requested resource doesn't exist
- `InternalServerError`: When an unexpected server error occurs

**Example error handling:**

```typescript
import { ApolloError } from '@apollo/client';

try {
  await mutation({ variables });
} catch (error) {
  if (error instanceof ApolloError) {
    error.graphQLErrors.forEach((err) => {
      console.error('GraphQL error:', err.message);
    });
  }
}
```

---

## Best Practices

1. **Use Fragments** for reusable field selections:

   ```graphql
   fragment SellerBasicInfo on Seller {
     id
     email
     sellerType
     isActive
   }

   query GetSeller($id: String!) {
     seller(id: $id) {
       ...SellerBasicInfo
       profile {
         ... on PersonProfile {
           firstName
           lastName
         }
       }
     }
   }
   ```

2. **Implement optimistic UI updates** for better UX:

   ```typescript
   const [updateProfile] = useMutation(UPDATE_PROFILE, {
     optimisticResponse: {
       updatePersonProfile: {
         __typename: 'PersonProfile',
         ...input,
       },
     },
   });
   ```

3. **Use query variables** instead of string interpolation
4. **Cache management**: Update Apollo cache after mutations
5. **Pagination**: Use `limit` and `offset` for large datasets

---

**Last Updated:** December 23, 2025

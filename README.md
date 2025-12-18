# Ekoru Users Subgraph

A NestJS GraphQL Federation microservice for managing users, sellers, locations, and authentication in the Ekoru platform.

## 📋 Overview

This service is part of Ekoru's federated GraphQL architecture and handles:

- **Seller Management**: Registration and profiles for both individuals and businesses
- **Authentication & Account Management**: User login, registration, and account operations
- **Location Services**: Countries, regions, counties, and cities data
- **Email Notifications**: Transactional emails via Nodemailer
- **User Preferences**: Seller-specific settings and configurations

### Technology Stack

- **Framework**: NestJS 11.x with TypeScript
- **API**: GraphQL with Apollo Federation v2
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: class-validator & class-transformer
- **Security**: bcrypt for password hashing
- **Email**: Nodemailer (Zoho SMTP)
- **Node Version**: 22.14.0+

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js**: >= 22.14.0
- **npm**: >= 10.0.0
- **PostgreSQL**: Latest stable version
- **Git**: For version control

### 1. Clone & Install

```bash
# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=4001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ekoru_users?schema=public"

# Email (Zoho SMTP)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
MAIL=your-email@zoho.com
PASSWORD=your-email-password
```

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### 4. Start Development Server

```bash
# Development mode with hot-reload
npm run start:dev

# The server will start on http://localhost:4001
# GraphQL Playground: http://localhost:4001/graphql
```

## 📁 Project Structure

```
src/
├── account/              # Authentication & account management
│   ├── account.module.ts
│   ├── account.resolver.ts
│   └── account.service.ts
├── sellers/              # Seller registration & profiles
│   ├── dto/             # Input DTOs for mutations
│   ├── entities/        # GraphQL entity types
│   ├── sellers.module.ts
│   ├── sellers.resolver.ts
│   └── sellers.service.ts
├── location/             # Geographic data management
│   ├── entities/        # Country, Region, County, City
│   ├── location.module.ts
│   ├── location.resolver.ts
│   └── location.service.ts
├── mail/                 # Email service
│   ├── mail.module.ts
│   └── mail.service.ts
├── prisma/               # Database service
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common/               # Shared utilities
│   ├── decorators/      # Custom decorators
│   └── exceptions/      # Custom exception filters
├── config/               # Configuration management
│   └── configuration.ts
├── graphql/              # GraphQL setup
│   ├── enums/           # GraphQL enums
│   └── scalars/         # Custom scalars (DateTime, JSON)
├── health/               # Health check endpoint
│   └── health.controller.ts
├── types/                # TypeScript types
├── app.module.ts         # Root module
└── main.ts               # Application entry point
```

## 🛠️ Available Scripts

```bash
# Development
npm run start              # Start server
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start with debugging

# Building
npm run build              # Build for production

# Code Quality
npm run format             # Format code with Prettier
npm run lint               # Lint and auto-fix with ESLint

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests
npm run test:debug         # Debug tests
```

## 🔑 Key Features & Modules

### Sellers Module

Handles seller registration and profile management:

- **Person Registration**: Individual seller accounts
- **Business Registration**: Business/company seller accounts
- **Profile Updates**: Update personal or business information
- **Seller Preferences**: Manage notifications and settings
- **Seller Levels**: Track seller tier/status

### Account Module

Manages authentication and account operations:

- User registration and login
- Password hashing with bcrypt
- Session management
- Account verification

### Location Module

Provides geographic reference data:

- Countries
- Regions (states/provinces)
- Counties
- Cities

### Mail Module

Handles transactional email:

- Welcome emails
- Password resets
- Order confirmations
- Notifications

## 🎯 GraphQL API

### Accessing GraphQL Playground

When running in development mode, access the playground at:

```
http://localhost:4001/graphql
```

### Example Queries

```graphql
# Get all countries
query {
  countries {
    id
    name
    code
  }
}

# Get seller by ID
query {
  seller(id: "seller-uuid") {
    id
    email
    sellerLevel {
      name
    }
    personProfile {
      firstName
      lastName
    }
  }
}
```

### Example Mutations

```graphql
# Register a person seller
mutation {
  registerPerson(
    input: {
      email: "john@example.com"
      password: "SecurePass123!"
      firstName: "John"
      lastName: "Doe"
      phone: "+1234567890"
    }
  ) {
    id
    email
    personProfile {
      firstName
      lastName
    }
  }
}
```

## 🐳 Docker Support

### Development with Docker Compose

```bash
# Start QA environment
docker-compose -f compose.qa.yml up -d

# Start production environment
docker-compose -f compose.prod.yml up -d
```

### Build Docker Image

```bash
docker build -t ekoru-users:latest .
```

## 🗄️ Database

### Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create a new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (⚠️ development only)
npx prisma migrate reset
```

### Schema Management

The Prisma schema is located at `prisma/schema.prisma`. After modifying:

1. Run `npx prisma generate` to update the client
2. Run `npx prisma migrate dev` to create and apply migrations
3. Commit both schema and migration files

## 🔐 Security

- Passwords are hashed using bcrypt
- GraphQL playground is disabled in production
- CORS is enabled (configure allowed origins as needed)
- Input validation with class-validator
- SQL injection protection via Prisma

## 🧪 Testing

Tests are organized alongside source files:

```bash
# Unit tests
npm run test

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

## 📝 Code Style

This project uses:

- **ESLint**: For linting
- **Prettier**: For code formatting
- **TypeScript**: Strict mode enabled

Run before committing:

```bash
npm run format && npm run lint
```

## 🚢 Deployment

### Environment Variables (Production)

Ensure these are set in production:

```env
NODE_ENV=production
PORT=4001
DATABASE_URL=your_production_database_url
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
MAIL=production-email@domain.com
PASSWORD=production-password
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [GraphQL Federation](https://www.apollographql.com/docs/federation/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Apollo Server](https://www.apollographql.com/docs/apollo-server/)

## 👥 Team

- **Author**: Ignacio Rodríguez Rulas - EKORU CTO
- **Repository**: ekoru-users

## 📄 License

UNLICENSED - Private project

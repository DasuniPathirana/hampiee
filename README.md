# 🎁 Hampiee — Premium Sri Lankan Gifting Platform

> A world-class hamper & gift curation platform for Sri Lanka, built with .NET 10 + Angular 22.

[![CI/CD](https://github.com/DasuniPathirana/hampiee/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/DasuniPathirana/hampiee/actions)

## 🚀 Quick Start (Local Development)

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 22+](https://nodejs.org/) + npm 11+
- [Angular CLI 22+](https://angular.dev/): `npm install -g @angular/cli`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Start Infrastructure (DB, Redis, Search)
```bash
docker compose up postgres redis meilisearch -d
```

### 2. Run the API
```bash
cd src/Hampiee.API
# Copy and configure dev settings
cp appsettings.Development.json.example appsettings.Development.json
# Edit with your PayHere/SendGrid keys

dotnet run
# API: http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

### 3. Run the Frontend (Storefront)
```bash
cd src/Hampiee.Web
npm install
npm run start:storefront
# http://localhost:4200
```

### 4. Run Admin Panel
```bash
cd src/Hampiee.Web
npm run start:admin
# http://localhost:4300
```

---

## 🏗️ Architecture

```
hampiee/
├── src/
│   ├── Hampiee.Domain/         # Entities, Value Objects, Domain Events
│   ├── Hampiee.Application/    # CQRS Commands/Queries (MediatR), Service Interfaces
│   ├── Hampiee.Infrastructure/ # EF Core, PayHere, SendGrid, Redis, Storage
│   ├── Hampiee.API/            # ASP.NET Core Web API, Controllers, SignalR
│   └── Hampiee.Web/            # Angular 22 monorepo
│       ├── projects/storefront/ # Customer-facing SPA
│       └── projects/admin/      # Admin dashboard SPA
├── tests/
│   ├── Hampiee.UnitTests/
│   └── Hampiee.IntegrationTests/
├── infra/                       # Terraform (GCP/Azure IaC)
├── .github/workflows/           # CI/CD (GitHub Actions)
├── docker-compose.yml
└── Dockerfile
```

## 🔐 Security

- JWT RS256 authentication with refresh tokens
- Role-based authorization (Customer / Staff / Admin / SuperAdmin)
- Rate limiting on all endpoints (100 req/min API, 10 req/5min auth)
- OWASP security headers enforced
- All secrets via environment variables / Secret Manager
- PayHere MD5 hash verification on all payment notifications

## 💳 Payments

Integrated with **PayHere** (Sri Lanka's #1 payment gateway):
- Supports: Visa, Mastercard, Amex, eZ Cash, mCash, Frimi, Genie
- LKR primary currency
- Sandbox for development, production for live

## 🚢 Deployment

- **Google Cloud Run** (auto-scaling containers)
- **Cloudflare** for DNS, CDN, and WAF
- GitHub Actions CI/CD on every push to `main`

See [`infra/`](./infra/) for Terraform configurations.

## 📋 Environment Variables (Production)

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `REDIS_CONNECTION` | Redis connection string |
| `JWT_KEY` | JWT signing key (min 32 chars) |
| `PAYHERE_MERCHANT_ID` | PayHere merchant ID |
| `PAYHERE_MERCHANT_SECRET` | PayHere merchant secret |
| `SENDGRID_API_KEY` | SendGrid API key |
| `GCS_BUCKET` | Google Cloud Storage bucket |

---

Built with ❤️ for Sri Lanka 🇱🇰 | [hampiee.com](https://hampiee.com)

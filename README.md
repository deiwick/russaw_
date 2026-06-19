# RUSSAW: The Tactical Collective

An underground, high-contrast digital hub for Gen Z vigilantes. Decentralized, anonymous reporting ("The Void"), geospatial audit mapping ("The Map"), gamified tasks ("The Mission Board"), and a trust-validated communication layer ("The Operator Network").

## Technical Architecture

```
                       [ operator ]
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
       [ web (Next.js) ]           [ map canvas ]
              │ (REST API)
              ▼
       [ api (Express) ] ──(Stateless Auth)
              │
              ▼
     [ db (Postgres/PostGIS) ]
```

- **Frontend**: Next.js 14 App Router, built with pure Vanilla CSS custom properties to maintain a extremely low data footprint (< 50KB core payload) for operators on mobile data in the field.
- **Backend**: Node.js & Express API written in TypeScript. Prioritizes zero log tracking of operator IPs and cryptographic unlinkability of anonymous reports.
- **Database**: PostgreSQL 16 + PostGIS for lightning-fast spatial indexing and geospatial query analysis of Chennai's active audit zones.
- **Containerization**: Orchestrated via Docker Compose for uniform staging and one-line setup.

## Operations: Quick Start

To bootstrap the local terminal:

1. Clone the project and verify Docker is running.
2. Run the deployment sequence:
   ```bash
   docker compose up --build
   ```
3. Interfaces:
   - **Frontend**: `http://localhost:3000`
   - **API Terminal**: `http://localhost:5000/api`
   - **Database Connection**: `postgresql://operator:operator_secure_pass_2026@localhost:5432/russaw`

## Rules of Engagement

1. **Radical Transparency**: Every feature must display raw data. No corporate wrappers.
2. **Operator Anonymity**: No session tracking or cookies containing personally identifiable information. IP scrubbing at middleware layer.
3. **Data Efficiency**: Pages must load instantly on 3G speeds. No heavy UI kits. Pure, raw CSS design tokens.

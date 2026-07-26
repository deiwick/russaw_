-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. OPERATORS
-- Tiered network members. Aliases are cryptographic or pseudonymous.
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    alias VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    reputation_points INT DEFAULT 0,
    tier_level INT DEFAULT 1, -- 1: Recruit, 2: Scout, 3: Core Operator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. REPORTS ("The Void")
-- Anonymous reports of civic infrastructure faults, corruption, or failures.
-- To maintain absolute reporting privacy, report records contain no foreign key to operators.
-- Verification records are decoupled.
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- e.g., 'infrastructure', 'injustice', 'environmental'
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    evidence_url TEXT,            -- IPFS or local file upload
    geom GEOMETRY(Point, 4326),   -- Geospatial coordinate (WGS 84)
    status VARCHAR(20) DEFAULT 'unverified', -- 'unverified', 'verified', 'dismissed'
    upvotes INT DEFAULT 0,
    engaged_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index for reports to enable high-performance regional searches in Chennai
CREATE INDEX IF NOT EXISTS reports_geom_idx ON reports USING GIST (geom);

-- 3. MISSIONS ("The Mission Board")
-- Tactical tasks posted weekly for operators to investigate.
CREATE TABLE IF NOT EXISTS missions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    target_geom GEOMETRY(Point, 4326), -- Approximate target zone
    radius_meters INT DEFAULT 500,     -- Region radius
    points INT DEFAULT 100,            -- Rep points reward
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS missions_geom_idx ON missions USING GIST (target_geom);

-- 4. VALIDATIONS & FORUM KEYS
-- A decoupled validation table. When an operator files a report that gets validated,
-- they receive a validation_token. This token is consumed to upgrade their operator tier.
-- This breaks direct database linkage between the Operator profile and their specific report.
CREATE TABLE IF NOT EXISTS operator_keys (
    key_hash VARCHAR(64) PRIMARY KEY, -- SHA-256 of a validation token
    consumed BOOLEAN DEFAULT FALSE,
    tier_granted INT DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed data for Chennai central coordinates
-- Chennai Center: 13.0827, 80.2707
-- PostGIS uses (Longitude, Latitude) order: ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)
INSERT INTO missions (title, description, category, target_geom, radius_meters, points, is_active)
VALUES 
('Central Station Trash Accumulation', 'Document municipal waste piling up near the Central Station eastern exit. Photo proof required.', 'infrastructure', ST_SetSRID(ST_MakePoint(80.2724, 13.0818), 4326), 200, 150, TRUE),
('OMR Water Line Leakage', 'Locate and log the fresh water pipeline burst near Thoraipakkam junction. Help map water wastage.', 'infrastructure', ST_SetSRID(ST_MakePoint(80.2337, 12.9416), 4326), 400, 200, TRUE)
ON CONFLICT DO NOTHING;

-- 5. FORUM POSTS
-- Access restricted to authenticated operators (Scouts and above)
CREATE TABLE IF NOT EXISTS forum_posts (
    id SERIAL PRIMARY KEY,
    operator_alias VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


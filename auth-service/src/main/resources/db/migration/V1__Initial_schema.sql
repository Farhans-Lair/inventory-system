-- V1__Initial_schema.sql
-- auth-service initial schema, reverse-engineered from JPA entities.
-- Flyway applies this once on a fresh database. On an existing database
-- (already created by Hibernate's ddl-auto=update), baseline-on-migrate=true
-- marks this version as already applied without running it, so the existing
-- schema is preserved. Future schema changes go in V2__*, V3__*, etc.

CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(36)  NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    full_name     VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL,
    active        BIT(1)       NOT NULL DEFAULT 1,
    created_at    DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_tokens (
    id         VARCHAR(36)  NOT NULL,
    email      VARCHAR(255) NOT NULL,
    code       VARCHAR(255) NOT NULL,
    purpose    VARCHAR(50)  NOT NULL,
    expires_at DATETIME(6)  NOT NULL,
    used       BIT(1)       NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         VARCHAR(36)  NOT NULL,
    token      VARCHAR(512) NOT NULL UNIQUE,
    user_id    VARCHAR(255) NOT NULL,
    expires_at DATETIME(6)  NOT NULL,
    revoked    BIT(1)       NOT NULL DEFAULT 0,
    created_at DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

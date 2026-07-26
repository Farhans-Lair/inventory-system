
CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(36)  NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    full_name     VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL,
    active        TINYINT(1)       NOT NULL DEFAULT 1,
    created_at    DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_tokens (
    id         VARCHAR(36)  NOT NULL,
    email      VARCHAR(255) NOT NULL,
    code       VARCHAR(255) NOT NULL,
    purpose    VARCHAR(50)  NOT NULL,
    expires_at DATETIME(6)  NOT NULL,
    used       TINYINT(1)       NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         VARCHAR(36)  NOT NULL,
    token      VARCHAR(512) NOT NULL UNIQUE,
    user_id    VARCHAR(255) NOT NULL,
    expires_at DATETIME(6)  NOT NULL,
    revoked    TINYINT(1)       NOT NULL DEFAULT 0,
    created_at DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

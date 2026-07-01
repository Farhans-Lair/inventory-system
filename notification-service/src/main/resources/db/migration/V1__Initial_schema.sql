-- V1__Initial_schema.sql
-- notification-service initial schema.

CREATE TABLE IF NOT EXISTS notification_logs (
    id            VARCHAR(36)   NOT NULL,
    type          VARCHAR(255)  NOT NULL,
    channel       VARCHAR(255)  NOT NULL,
    recipient     VARCHAR(255)  NOT NULL,
    subject       VARCHAR(2000),
    body          VARCHAR(4000),
    sent          BIT(1)        NOT NULL DEFAULT 0,
    error_message VARCHAR(255),
    sent_at       DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

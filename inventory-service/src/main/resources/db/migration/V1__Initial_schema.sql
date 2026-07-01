-- V1__Initial_schema.sql
-- inventory-service initial schema, reverse-engineered from JPA entities.

CREATE TABLE IF NOT EXISTS products (
    id                   VARCHAR(36)    NOT NULL,
    sku                  VARCHAR(255)   NOT NULL UNIQUE,
    name                 VARCHAR(255)   NOT NULL,
    description          VARCHAR(255),
    category             VARCHAR(255),
    unit                 VARCHAR(255)   NOT NULL,
    image_url            VARCHAR(255),
    cost_price           DECIMAL(12,2),
    selling_price        DECIMAL(12,2),
    barcode_value        VARCHAR(255),
    has_expiry_tracking  BIT(1)         NOT NULL DEFAULT 0,
    active               BIT(1)         NOT NULL DEFAULT 1,
    created_at           DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS locations (
    id          VARCHAR(36)  NOT NULL,
    name        VARCHAR(255) NOT NULL UNIQUE,
    zone        VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    capacity    INT,
    active      BIT(1)       NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_levels (
    id           VARCHAR(36) NOT NULL,
    product_id   VARCHAR(36) NOT NULL,
    location_id  VARCHAR(36) NOT NULL,
    quantity     INT         NOT NULL DEFAULT 0,
    min_quantity INT                  DEFAULT 0,
    max_quantity INT                  DEFAULT 0,
    last_updated DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_location (product_id, location_id),
    CONSTRAINT fk_sl_product  FOREIGN KEY (product_id)  REFERENCES products(id),
    CONSTRAINT fk_sl_location FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
    id               VARCHAR(36)  NOT NULL,
    product_id       VARCHAR(36)  NOT NULL,
    from_location_id VARCHAR(36),
    to_location_id   VARCHAR(36),
    type             VARCHAR(50)  NOT NULL,
    quantity         INT          NOT NULL,
    reason           VARCHAR(255),
    reason_code      VARCHAR(255),
    performed_by     VARCHAR(255),
    timestamp        DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_sm_product      FOREIGN KEY (product_id)       REFERENCES products(id),
    CONSTRAINT fk_sm_from_loc     FOREIGN KEY (from_location_id) REFERENCES locations(id),
    CONSTRAINT fk_sm_to_loc       FOREIGN KEY (to_location_id)   REFERENCES locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_reservations (
    id           VARCHAR(36)  NOT NULL,
    product_id   VARCHAR(36)  NOT NULL,
    location_id  VARCHAR(36)  NOT NULL,
    quantity     INT          NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    notes        VARCHAR(255),
    reserved_by  VARCHAR(255) NOT NULL,
    status       VARCHAR(50)  NOT NULL,
    created_at   DATETIME(6),
    expires_at   DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_sr_product  FOREIGN KEY (product_id)  REFERENCES products(id),
    CONSTRAINT fk_sr_location FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS batch_lots (
    id               VARCHAR(36) NOT NULL,
    product_id       VARCHAR(36) NOT NULL,
    location_id      VARCHAR(36) NOT NULL,
    lot_number       VARCHAR(255) NOT NULL,
    manufacture_date DATE,
    expiry_date      DATE,
    quantity         INT         NOT NULL,
    created_at       DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_bl_product  FOREIGN KEY (product_id)  REFERENCES products(id),
    CONSTRAINT fk_bl_location FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cycle_counts (
    id               VARCHAR(36)  NOT NULL,
    product_id       VARCHAR(36)  NOT NULL,
    location_id      VARCHAR(36)  NOT NULL,
    system_quantity  INT,
    counted_quantity INT,
    variance         INT,
    notes            VARCHAR(255),
    counted_by       VARCHAR(255),
    status           VARCHAR(50)  NOT NULL,
    counted_at       DATETIME(6),
    reconciled_at    DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_cc_product  FOREIGN KEY (product_id)  REFERENCES products(id),
    CONSTRAINT fk_cc_location FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uom_conversions (
    id          VARCHAR(36)  NOT NULL,
    from_unit   VARCHAR(255) NOT NULL,
    to_unit     VARCHAR(255) NOT NULL,
    factor      DOUBLE       NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY uq_uom_from_to (from_unit, to_unit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
    id                    VARCHAR(36)  NOT NULL,
    product_id            VARCHAR(36)  NOT NULL,
    sku                   VARCHAR(255) NOT NULL UNIQUE,
    name                  VARCHAR(255) NOT NULL,
    attributes            VARCHAR(512),
    cost_price_override   DECIMAL(12,2),
    selling_price_override DECIMAL(12,2),
    image_url             VARCHAR(255),
    active                BIT(1)       NOT NULL DEFAULT 1,
    created_at            DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

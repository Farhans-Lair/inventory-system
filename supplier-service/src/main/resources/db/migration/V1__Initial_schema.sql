-- V1__Initial_schema.sql
-- supplier-service initial schema.

CREATE TABLE IF NOT EXISTS suppliers (
    id             VARCHAR(36)  NOT NULL,
    name           VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email          VARCHAR(255),
    phone          VARCHAR(255),
    address        VARCHAR(255),
    active         BIT(1)       NOT NULL DEFAULT 1,
    created_at     DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_orders (
    id                     VARCHAR(36)    NOT NULL,
    po_number              VARCHAR(255)   NOT NULL UNIQUE,
    supplier_id            VARCHAR(36)    NOT NULL,
    status                 VARCHAR(50)    NOT NULL,
    expected_delivery_date DATE,
    notes                  VARCHAR(255),
    total_amount           DECIMAL(14,2),
    created_by             VARCHAR(255),
    created_at             DATETIME(6),
    received_at            DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id                VARCHAR(36)  NOT NULL,
    po_id             VARCHAR(36)  NOT NULL,
    product_id        VARCHAR(255) NOT NULL,
    product_sku       VARCHAR(255) NOT NULL,
    product_name      VARCHAR(255) NOT NULL,
    ordered_quantity  INT          NOT NULL,
    received_quantity INT                   DEFAULT 0,
    unit_price        DECIMAL(12,2),
    PRIMARY KEY (id),
    CONSTRAINT fk_pol_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goods_receipt_notes (
    id                VARCHAR(36)  NOT NULL,
    po_id             VARCHAR(36)  NOT NULL,
    product_id        VARCHAR(255) NOT NULL,
    received_quantity INT          NOT NULL,
    location_id       VARCHAR(255) NOT NULL,
    batch_number      VARCHAR(255),
    notes             VARCHAR(255),
    received_by       VARCHAR(255),
    received_at       DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_grn_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

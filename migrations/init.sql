-- SanrioCoffee Database Schema

-- ENUM types
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE payment_method AS ENUM ('credit_card', 'line_pay', 'cash_on_pickup');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE point_type AS ENUM ('earn', 'redeem');

-- Users
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    phone         VARCHAR(20),
    role          VARCHAR(20)  NOT NULL DEFAULT 'consumer' CHECK (role IN ('admin', 'consumer')),
    points        INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT true
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id           BIGSERIAL PRIMARY KEY,
    category_id  BIGINT       NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    price        DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    image_url    TEXT,
    is_available BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Product customization options (e.g. size, ice, sugar, add-ons)
CREATE TABLE IF NOT EXISTS product_customizations (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    option_type VARCHAR(20)   NOT NULL CHECK (option_type IN ('size', 'ice', 'sugar', 'addon')),
    name        VARCHAR(100)  NOT NULL,
    price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
    sort_order  INT           NOT NULL DEFAULT 0
);

-- Cart items (one row per unique product+customization combo per user)
CREATE TABLE IF NOT EXISTS cart_items (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      BIGINT      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity        INT         NOT NULL DEFAULT 1 CHECK (quantity > 0),
    customizations  JSONB       NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    subtotal        DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    points_used     INT          NOT NULL DEFAULT 0,
    total_price     DECIMAL(10,2) NOT NULL,
    status          order_status NOT NULL DEFAULT 'pending',
    note            TEXT,
    pickup_time     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Order line items (snapshot of product at order time)
CREATE TABLE IF NOT EXISTS order_items (
    id              BIGSERIAL     PRIMARY KEY,
    order_id        BIGINT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      BIGINT        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name    VARCHAR(255)  NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    quantity        INT           NOT NULL CHECK (quantity > 0),
    customizations  JSONB         NOT NULL DEFAULT '[]',
    subtotal        DECIMAL(10,2) NOT NULL
);

-- Payments (one-to-one with orders)
CREATE TABLE IF NOT EXISTS payments (
    id             BIGSERIAL      PRIMARY KEY,
    order_id       BIGINT         NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    amount         DECIMAL(10,2)  NOT NULL,
    method         payment_method NOT NULL,
    status         payment_status NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(100),
    paid_at        TIMESTAMPTZ
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id                BIGSERIAL     PRIMARY KEY,
    code              VARCHAR(50)   NOT NULL UNIQUE,
    name              VARCHAR(255)  NOT NULL,
    discount_type     VARCHAR(20)   NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value    DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
    valid_from        TIMESTAMPTZ   NOT NULL,
    valid_until       TIMESTAMPTZ   NOT NULL,
    usage_limit       INT,
    used_count        INT           NOT NULL DEFAULT 0,
    is_active         BOOLEAN       NOT NULL DEFAULT true
);

-- Track coupon usage per user
CREATE TABLE IF NOT EXISTS user_coupons (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id  BIGINT      NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, coupon_id)
);

-- Points transaction history
CREATE TABLE IF NOT EXISTS point_transactions (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_delta INT        NOT NULL,
    type        point_type  NOT NULL,
    order_id    BIGINT      REFERENCES orders(id) ON DELETE SET NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);

-- Seed data: default categories
INSERT INTO categories (name, description, sort_order) VALUES
    ('熱飲', '各式熱咖啡與熱茶', 1),
    ('冷飲', '冰咖啡、冰茶與特調', 2),
    ('茶飲', '精選茶類飲品', 3),
    ('輕食', '三明治、蛋糕與點心', 4)
ON CONFLICT (name) DO NOTHING;

-- Gift Record
CREATE TABLE IF NOT EXISTS gifts (
    id              BIGSERIAL PRIMARY KEY,
    sender_id       BIGINT      NOT NULL REFERENCES users(id),
    order_id        BIGINT      NOT NULL REFERENCES orders(id), -- 關聯到哪筆訂單
    gift_code       VARCHAR(20) NOT NULL UNIQUE,                -- 兌換碼 (例如: POMPOM-2024-XXXX)
    receiver_id     BIGINT      REFERENCES users(id),           -- 領取人 (初期為 NULL)
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
    message         TEXT,                                       -- A 給 B 的悄悄話 (例如：Hangyodon 祝你今天開心！)
    claimed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gifts_code ON gifts(gift_code);
CREATE INDEX IF NOT EXISTS idx_gifts_sender ON gifts(sender_id);

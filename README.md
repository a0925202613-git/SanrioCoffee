# SanrioCoffee API

一個以三麗鷗風格為靈感設計的咖啡線上點餐平台後端 API，功能涵蓋商品管理、購物車、線上點餐、假金流、點數獎勵與優惠券系統。

---

## 技術棧

| 層級       | 技術                                                               |
| ---------- | ------------------------------------------------------------------ |
| 語言       | Go 1.25                                                            |
| HTTP 框架  | [Gin v1.12](https://github.com/gin-gonic/gin)                      |
| 資料庫驅動 | [pgx/v5](https://github.com/jackc/pgx) + pgxpool（連線池）         |
| 快取       | [go-redis/v9](https://github.com/redis/go-redis)                   |
| 身份驗證   | [golang-jwt/jwt v5](https://github.com/golang-jwt/jwt)（HS256）    |
| 密碼雜湊   | bcrypt（golang.org/x/crypto）                                      |
| 設定管理   | [Viper](https://github.com/spf13/viper)（支援 .env + config.yaml） |
| 結構化日誌 | [Zap](https://github.com/uber-go/zap)                              |
| 資料庫     | PostgreSQL（含 ENUM、JSONB、pgxpool 事務）                         |

---

## 專案架構

```
SanrioCoffee/
├── main.go                    # 程式進入點，DI 組裝、啟動 Gin server
├── routes.go                  # 路由定義（public / protected / admin / consumer）
├── go.mod / go.sum
├── Makefile
├── .env.example
├── config/
│   ├── config.go              # Viper 設定載入（.env 優先，fallback config.yaml）
│   └── config.yaml            # 預設設定（port、db name 等）
├── migrations/
│   └── init.sql               # 完整 PostgreSQL schema（11 張 table + 4 ENUM）
├── static/uploads/            # 商品圖片上傳目錄
├── internal/
│   ├── model/                 # 資料結構與 Request/Response DTO
│   │   ├── user.go
│   │   ├── category.go
│   │   ├── product.go
│   │   ├── cart.go
│   │   ├── order.go
│   │   ├── payment.go
│   │   └── coupon.go
│   ├── repository/            # 資料存取層（直接操作 pgxpool）
│   │   ├── errors.go          # ErrNotFound / ErrAlreadyExists
│   │   ├── user_repository.go
│   │   ├── category_repository.go
│   │   ├── product_repository.go
│   │   ├── cart_repository.go
│   │   ├── order_repository.go
│   │   ├── payment_repository.go
│   │   └── coupon_repository.go
│   ├── service/               # 業務邏輯層（事務、快取、規則驗證）
│   │   ├── auth_service.go
│   │   ├── category_service.go
│   │   ├── product_service.go
│   │   ├── cart_service.go
│   │   ├── order_service.go
│   │   ├── payment_service.go
│   │   ├── coupon_service.go
│   │   └── points_service.go
│   └── handler/               # HTTP 處理層（解析請求 → 呼叫 service → 回應）
│       ├── auth_handler.go
│       ├── category_handler.go
│       ├── product_handler.go
│       ├── cart_handler.go
│       ├── order_handler.go
│       ├── payment_handler.go
│       ├── coupon_handler.go
│       └── member_handler.go
└── pkg/
    ├── database/postgres.go   # pgxpool 連線 + WithTx 事務 helper
    ├── redis/redis.go         # Redis 客戶端（連線失敗時優雅降級）
    ├── middleware/auth.go     # JWT middleware + AdminOnly / ConsumerOnly
    ├── logger/logger.go       # Zap logger 初始化
    └── response/response.go  # 統一 JSON 回應格式
```

### 分層責任

```
Request → Handler（解析/驗證） → Service（業務邏輯/事務） → Repository（SQL）
                                        ↕
                                    Redis 快取
```

---

## 資料庫 Schema

### ENUM 型別

| ENUM             | 值                                                                |
| ---------------- | ----------------------------------------------------------------- |
| `order_status`   | `pending`, `paid`, `preparing`, `ready`, `completed`, `cancelled` |
| `payment_method` | `credit_card`, `line_pay`, `cash_on_pickup`                       |
| `payment_status` | `pending`, `success`, `failed`                                    |
| `point_type`     | `earn`, `redeem`                                                  |

### 資料表（11 張）

| 資料表                   | 說明                                                 |
| ------------------------ | ---------------------------------------------------- |
| `users`                  | 會員（admin / consumer）、含點數餘額                 |
| `categories`             | 商品分類，支援排序與上下架                           |
| `products`               | 商品，含圖片、分類、上下架狀態                       |
| `product_customizations` | 客製化選項（杯型/冰量/甜度/加料），含加價金額        |
| `cart_items`             | 購物車，customizations 以 JSONB 儲存                 |
| `orders`                 | 訂單主表，含小計、折扣、點數折抵、合計               |
| `order_items`            | 訂單明細，快照商品名稱與單價（防止商品改價影響歷史） |
| `payments`               | 付款記錄，含方法、狀態、假交易序號                   |
| `coupons`                | 優惠券，支援固定金額／百分比，含使用次數限制         |
| `user_coupons`           | 記錄使用者已使用哪張優惠券                           |
| `point_transactions`     | 點數異動歷程（+獲得 / -使用）                        |

---

## API 說明

所有路由基底：`/api/v1`

統一回應格式：

```json
{ "code": 200, "message": "ok", "data": { ... } }
```

---

### 認證 `POST /auth/*`（公開）

| 方法 | 路徑             | 說明                                           |
| ---- | ---------------- | ---------------------------------------------- |
| POST | `/auth/register` | 註冊（username、email、password、role、phone） |
| POST | `/auth/login`    | 登入，回傳 JWT token                           |
| GET  | `/me`            | 取得當前登入使用者資訊（需 token）             |

---

### 分類 `/categories`

| 方法   | 路徑              | 權限  | 說明                               |
| ------ | ----------------- | ----- | ---------------------------------- |
| GET    | `/categories`     | 公開  | 取得所有分類（依 sort_order 排序） |
| POST   | `/categories`     | Admin | 新增分類                           |
| PUT    | `/categories/:id` | Admin | 更新分類（支援部分更新）           |
| DELETE | `/categories/:id` | Admin | 刪除分類                           |

---

### 商品 `/products`

| 方法   | 路徑                                  | 權限  | 說明                                                 |
| ------ | ------------------------------------- | ----- | ---------------------------------------------------- |
| GET    | `/products`                           | 公開  | 商品列表，支援 `?category_id=&available=true` 篩選   |
| GET    | `/products/:id`                       | 公開  | 單一商品詳情（含客製化選項）                         |
| GET    | `/products/:id/customizations`        | 公開  | 取得商品客製化選項列表                               |
| POST   | `/products`                           | Admin | 新增商品                                             |
| PUT    | `/products/:id`                       | Admin | 更新商品（支援部分更新）                             |
| PATCH  | `/products/:id/availability`          | Admin | 切換上下架狀態                                       |
| DELETE | `/products/:id`                       | Admin | 刪除商品                                             |
| POST   | `/products/:id/customizations`        | Admin | 新增客製化選項                                       |
| DELETE | `/products/:id/customizations/:optId` | Admin | 刪除客製化選項                                       |
| POST   | `/products/upload`                    | Admin | 上傳商品圖片（jpg/png/webp，5MB 上限），回傳圖片路徑 |

---

### 購物車 `/cart`（Consumer Only）

| 方法   | 路徑              | 說明                                       |
| ------ | ----------------- | ------------------------------------------ |
| GET    | `/cart`           | 取得購物車內容（含客製化加價計算後的小計） |
| POST   | `/cart/items`     | 加入商品（含客製化選項 JSONB）             |
| PUT    | `/cart/items/:id` | 更新數量或客製化                           |
| DELETE | `/cart/items/:id` | 移除單筆項目                               |
| DELETE | `/cart`           | 清空購物車                                 |

---

### 訂單 `/orders`（需登入）

| 方法  | 路徑                 | 說明                                                        |
| ----- | -------------------- | ----------------------------------------------------------- |
| POST  | `/orders`            | Consumer：從購物車建立訂單（單一事務，見下方核心流程）      |
| GET   | `/orders`            | Admin：全部訂單（可 `?status=` 篩選）；Consumer：自己的訂單 |
| GET   | `/orders/:id`        | 取得訂單詳情（含明細）；Consumer 只能看自己的               |
| PATCH | `/orders/:id/status` | Admin：更新訂單狀態（`preparing`→`ready`→`completed`）      |
| PATCH | `/orders/:id/cancel` | Consumer：取消訂單（只有 `pending` 狀態可取消）             |

#### 建立訂單核心事務流程

```
BEGIN TRANSACTION
  1. 讀取購物車（in-tx）→ 驗證非空
  2. 若有 coupon_code → SELECT FOR UPDATE 鎖定優惠券列，驗證有效期/次數，計算折扣
  3. 若有 points_to_redeem → SELECT FOR UPDATE 鎖定 user 列，驗證點數足夠，扣除
  4. INSERT orders（計算 subtotal / discount / total）
  5. INSERT order_items（快照商品名稱與單價）
  6. INSERT point_transactions（消費獲得點數，NT$10 = 1 點）
  7. UPDATE users.points（加減點數）
  8. DELETE cart_items（清空購物車）
COMMIT
```

---

### 假金流 `/payments`

| 方法 | 路徑                        | 說明                                                                                             |
| ---- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| POST | `/payments/initiate`        | 建立付款記錄（status=pending），回傳假交易序號                                                   |
| POST | `/payments/callback`        | 模擬金流回調（90% 隨機成功；可傳 `force_result=success\|failed`）；支援 query param 或 JSON body |
| GET  | `/payments/callback`        | 同上（支援 GET 模擬 webhook）                                                                    |
| GET  | `/payments/:orderId/status` | 查詢指定訂單的付款狀態                                                                           |

#### 假金流流程

```
POST /payments/initiate  → 建立 payment(status=pending) + 產生假 transaction_id
POST /payments/callback  → 驗證 transaction_id
                         → 成功(90%)：UPDATE payments(status=success) + UPDATE orders(status=paid)
                         → 失敗(10%)：UPDATE payments(status=failed)
                         （以上兩個 UPDATE 在同一事務內執行）
```

---

### 優惠券 `/coupons`

| 方法   | 路徑                | 權限     | 說明                                                     |
| ------ | ------------------- | -------- | -------------------------------------------------------- |
| POST   | `/coupons`          | Admin    | 建立優惠券（percentage / fixed，含有效期與使用次數限制） |
| GET    | `/coupons`          | Admin    | 取得所有優惠券列表                                       |
| PATCH  | `/coupons/:id`      | Admin    | 啟用 / 停用優惠券                                        |
| DELETE | `/coupons/:id`      | Admin    | 刪除優惠券                                               |
| POST   | `/coupons/validate` | Consumer | 驗證折扣碼，回傳折扣金額（不扣次數，僅預覽）             |

---

### 點數 `/me/points`（Consumer）

| 方法 | 路徑         | 說明                                       |
| ---- | ------------ | ------------------------------------------ |
| GET  | `/me/points` | 取得點數餘額 + 完整異動歷程（獲得 / 使用） |

#### 點數規則

- 消費每 NT$10 獲得 1 點
- 結帳時每 1 點可折抵 NT$1
- 點數操作皆在訂單事務內以 SELECT FOR UPDATE 防止並發問題

---

## 快取策略（Redis）

| Key               | 內容                   | TTL     |
| ----------------- | ---------------------- | ------- |
| `categories:list` | 所有分類列表           | 10 分鐘 |
| `products:list`   | 商品列表（含篩選條件） | 5 分鐘  |
| `product:{id}`    | 單一商品詳情           | 5 分鐘  |

商品新增 / 更新 / 刪除 / 上下架 → 自動清除對應 cache。Redis 連線失敗時系統仍正常運作（cache-aside 降級）。

---

## 角色權限

| 功能               | Admin | Consumer |
| ------------------ | :---: | :------: |
| 商品 CRUD / 上下架 |   ✓   |   唯讀   |
| 分類 CRUD          |   ✓   |   唯讀   |
| 優惠券 CRUD        |   ✓   |  僅驗證  |
| 購物車             |   —   |    ✓     |
| 建立訂單           |   —   |    ✓     |
| 查看所有訂單       |   ✓   |  僅自己  |
| 更新訂單狀態       |   ✓   |  僅取消  |
| 點數查詢           |   —   |    ✓     |

---

## 本地啟動

### 1. 環境需求

- Go 1.21+
- PostgreSQL 14+
- Redis 6+（可選，無 Redis 仍可啟動）

### 2. 設定

```bash
cp .env.example .env
# 編輯 .env 填入 DB 連線資訊與 JWT_SECRET
```

### 3. 資料庫初始化

```bash
createdb -U postgres sanrio_coffee
psql -U postgres -d sanrio_coffee -f migrations/init.sql
```

### 4. 啟動後端

```bash
go run .
# API 啟動於 http://localhost:8080
```

### 5. 啟動前端

```bash
cd frontend
npm install
npm run dev
# 前端啟動於 http://localhost:5173（含 Vite proxy）
```

---

## 環境變數

| 變數               | 預設值           | 說明                        |
| ------------------ | ---------------- | --------------------------- |
| `DB_HOST`          | `localhost`      | PostgreSQL 主機             |
| `DB_PORT`          | `5432`           | PostgreSQL 連接埠           |
| `DB_USER`          | `postgres`       | 資料庫使用者                |
| `DB_PASSWORD`      | _(空)_           | 資料庫密碼                  |
| `DB_NAME`          | `sanrio_coffee`  | 資料庫名稱                  |
| `REDIS_ADDR`       | `localhost:6379` | Redis 位址                  |
| `JWT_SECRET`       | _(必填)_         | JWT 簽名金鑰                |
| `JWT_EXPIRE_HOURS` | `72`             | Token 有效時數              |
| `SERVER_PORT`      | `8080`           | API 服務埠                  |
| `GIN_MODE`         | `debug`          | Gin 模式（debug / release） |

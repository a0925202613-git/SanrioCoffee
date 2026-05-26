-- ═══════════════════════════════════════════════════
-- SANRIO COFFEE · 完整版測試資料種子 (seed.sql)
-- ═══════════════════════════════════════════════════

-- 1. 確保基礎分類完整
INSERT INTO categories (id, name, description, sort_order) VALUES
(1, '咖啡飲品', '精選現磨咖啡，可自由選擇冷飲或熱飲', 1),
(2, '茶飲或其他特調', '精選茶類與風味特調飲品', 2),
(3, '主食', '千層麵、燉飯', 3),
(4, '輕食', '三明治、蛋糕與點心', 4)
ON CONFLICT (id) DO NOTHING;

-- 2. 寫入基本商品：美式咖啡 (ID: 1) 與 冰醇濃抹茶那堤 (ID: 4)
INSERT INTO products (id, category_id, name, description, price, image_url, is_available) VALUES
(1, 1, '美式咖啡', '使用當季特選豆製作的濃縮咖啡，品味不同風味變化...', 120.00, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93', true),
(4, 2, '冰醇濃抹茶那堤 Iced Pure Matcha Latte', '使用精心臻選，品質優良的日本純抹茶，加入新鮮牛奶與原味糖漿製成。', 165.00, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a', true)
ON CONFLICT (id) DO NOTHING;

-- 3. 建立所有的客製化大群組 (對齊你的第 8 張圖)
INSERT INTO customization_groups (id, name, option_type) VALUES 
(10, '冰量與溫度', 'ice'),
(11, '甜度選擇', 'sugar'),
(12, '杯型', 'size'),
(13, '加料選擇 (可複選)', 'addon'),
(14, '更換風味', 'flavor')
ON CONFLICT (id) DO NOTHING;

-- 4. 塞入完全對齊你 pgAdmin 的 17 筆核心項目細項 (對齊你的第 9 張圖)
-- 💡 冰量與溫度 (group_id: 10)
INSERT INTO customization_items (id, group_id, name, price_delta, sort_order) VALUES
(101, 10, '正常冰', 0.00, 1),
(102, 10, '少冰', 0.00, 2),
(103, 10, '去冰', 0.00, 3),
(104, 10, '熱飲 (Hot)', 0.00, 4)
ON CONFLICT (id) DO NOTHING;

-- 💡 甜度選擇 (group_id: 11)
INSERT INTO customization_items (id, group_id, name, price_delta, sort_order) VALUES
(201, 11, '正常糖', 0.00, 1),
(202, 11, '少糖 (7分)', 0.00, 2),
(203, 11, '半糖 (5分)', 0.00, 3),
(204, 11, '微糖 (3分)', 0.00, 4),
(205, 11, '無糖', 0.00, 5)
ON CONFLICT (id) DO NOTHING;

-- 💡 杯型 (group_id: 12)
INSERT INTO customization_items (id, group_id, name, price_delta, sort_order) VALUES
(301, 12, '中杯', 15.00, 1),
(302, 12, '大杯', 20.00, 2)
ON CONFLICT (id) DO NOTHING;

-- 💡 加料選擇 (可複選) (group_id: 13)
INSERT INTO customization_items (id, group_id, name, price_delta, sort_order) VALUES
(401, 13, '經典黑珍珠', 10.00, 1),
(402, 13, '風味椰果', 10.00, 2),
(403, 13, '健康燕麥粒', 15.00, 3)
ON CONFLICT (id) DO NOTHING;

-- 💡 更換風味 (group_id: 14)
INSERT INTO customization_items (id, group_id, name, price_delta, sort_order) VALUES
(501, 14, '榛果風味糖漿', 15.00, 2),
(502, 14, '焦糖風味糖漿', 15.00, 3),
(503, 14, '香草風味糖漿', 15.00, 4)
ON CONFLICT (id) DO NOTHING;

-- 5. 綁定商品與群組（連連看關係）
INSERT INTO product_customization_groups (product_id, group_id) VALUES
(1, 10), (1, 12),                          -- 美式咖啡：冰量、杯型
(4, 10), (4, 11), (4, 12), (4, 13), (4, 14) -- 抹茶那堤：冰量、甜度、杯型、加料、風味
ON CONFLICT (product_id, group_id) DO NOTHING;

-- 6. 黑名單限制防禦：抹茶那堤 (ID: 4) 禁止點 熱飲 (ID: 104)
INSERT INTO product_customization_restrictions (product_id, item_id, is_disabled) VALUES
(4, 104, true)
ON CONFLICT (product_id, item_id) DO NOTHING;

-- 7. 修正 sequence：讓顯式 ID 插入後，下一筆 AUTO ID 不衝突
SELECT setval(pg_get_serial_sequence('categories',          'id'), MAX(id)) FROM categories;
SELECT setval(pg_get_serial_sequence('products',            'id'), MAX(id)) FROM products;
SELECT setval(pg_get_serial_sequence('customization_groups','id'), MAX(id)) FROM customization_groups;
SELECT setval(pg_get_serial_sequence('customization_items', 'id'), MAX(id)) FROM customization_items;
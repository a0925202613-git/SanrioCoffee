package repository

import (
	"context"
	"fmt"
	"strings"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

type ProductRepository struct {
	db *database.DB
}

func NewProductRepository(db *database.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) List(ctx context.Context, categoryID int64, availableOnly bool) ([]model.Product, error) {
	query := `
        SELECT 
            id, 
            category_id, 
            name, 
            COALESCE(description, '') AS description, 
            price, 
            COALESCE(image_url, '') AS image_url, 
            is_available, 
            created_at 
        FROM products 
        WHERE 1=1`

	args := []interface{}{}
	idx := 1

	if categoryID > 0 {
		query += fmt.Sprintf(" AND category_id = $%d", idx)
		args = append(args, categoryID)
		idx++
	}
	if availableOnly {
		query += fmt.Sprintf(" AND is_available = $%d", idx)
		args = append(args, true)
		idx++
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.IsAvailable, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	if products == nil {
		products = []model.Product{}
	}

	return products, rows.Err()
}

func (r *ProductRepository) FindByID(ctx context.Context, id int64) (*model.Product, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT 
			id, category_id, name, COALESCE(description, ''), price, COALESCE(image_url, ''), is_available, created_at 
		FROM products WHERE id = $1`, id)

	var p model.Product
	err := row.Scan(&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.IsAvailable, &p.CreatedAt)
	if err != nil {
		// 💡 不管是哪種 ErrNoRows，只要找不到，一律強迫回傳找不到，不給 handler 噴 500 的機會
		if err == pgx.ErrNoRows || strings.Contains(err.Error(), "no rows") {
			return nil, fmt.Errorf("notfound")
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) Create(ctx context.Context, req *model.CreateProductRequest) (*model.Product, error) {
	// 💡 RETURNING 也要加上 COALESCE 保護
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO products (category_id, name, description, price, image_url) VALUES ($1,$2,$3,$4,$5)
         RETURNING id, category_id, name, COALESCE(description, '') AS description, price, COALESCE(image_url, '') AS image_url, is_available, created_at`,
		req.CategoryID, req.Name, req.Description, req.Price, req.ImageURL)
	return scanProduct(row)
}

func (r *ProductRepository) Update(ctx context.Context, id int64, req *model.UpdateProductRequest) (*model.Product, error) {
	existing, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.CategoryID != nil {
		existing.CategoryID = *req.CategoryID
	}
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.Price != nil {
		existing.Price = *req.Price
	}
	if req.ImageURL != nil {
		existing.ImageURL = *req.ImageURL
	}

	// 💡 RETURNING 交易返回時加上 COALESCE 保護
	row := r.db.Pool.QueryRow(ctx,
		`UPDATE products SET category_id=$1, name=$2, description=$3, price=$4, image_url=$5 WHERE id=$6
         RETURNING id, category_id, name, COALESCE(description, '') AS description, price, COALESCE(image_url, '') AS image_url, is_available, created_at`,
		existing.CategoryID, existing.Name, existing.Description, existing.Price, existing.ImageURL, id)
	return scanProduct(row)
}

func (r *ProductRepository) SetAvailability(ctx context.Context, id int64, available bool) (*model.Product, error) {
	// 💡 RETURNING 加上 COALESCE 保護
	row := r.db.Pool.QueryRow(ctx,
		`UPDATE products SET is_available=$1 WHERE id=$2 
         RETURNING id, category_id, name, COALESCE(description, '') AS description, price, COALESCE(image_url, '') AS image_url, is_available, created_at`,
		available, id)
	return scanProduct(row)
}

func (r *ProductRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.Pool.Exec(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ProductRepository) ListCustomizations(ctx context.Context, productID int64) ([]model.ProductCustomization, error) {
	// 🎯 修正核心：將 SELECT 裡的 $1 換成 pcg.product_id，讓 PostgreSQL 100% 確定它的型別就是 BIGINT
	// 🎯 同時保持 JOIN 的聚焦，按鈕重複的問題與型別衝突一次完美解決！
	query := `
		SELECT 
			i.id, 
			pcg.product_id, 
			COALESCE(g.option_type, 'size') AS option_type, 
			i.name, 
			i.price_delta,
			COALESCE(r.is_disabled, false) AS is_disabled
		FROM product_customization_groups pcg
		JOIN customization_groups g ON pcg.group_id = g.id
		JOIN customization_items i ON g.id = i.group_id
		LEFT JOIN product_customization_restrictions r 
			ON r.product_id = pcg.product_id AND r.item_id = i.id
		WHERE pcg.product_id = $1
		ORDER BY g.id, i.sort_order;
	`

	rows, err := r.db.Pool.Query(ctx, query, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.ProductCustomization
	for rows.Next() {
		var c model.ProductCustomization
		err := rows.Scan(&c.ID, &c.ProductID, &c.OptionType, &c.Name, &c.PriceDelta, &c.IsDisabled)
		if err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	if list == nil {
		list = []model.ProductCustomization{}
	}
	return list, nil
}

// AddCustomizationRestriction 負責在資料庫限制表插入一筆禁用紀錄
func (r *ProductRepository) AddCustomizationRestriction(ctx context.Context, productID, itemID int64, isDisabled bool) error {
	query := `
		INSERT INTO product_customization_restrictions (product_id, item_id, is_disabled)
		VALUES ($1, $2, $3)
		ON CONFLICT (product_id, item_id) 
		DO UPDATE SET is_disabled = EXCLUDED.is_disabled;
	`
	_, err := r.db.Pool.Exec(ctx, query, productID, itemID, isDisabled)
	return err
}

func (r *ProductRepository) AddCustomization(ctx context.Context, productID int64, req *model.CreateCustomizationRequest) (*model.ProductCustomization, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var groupID int64
	err = tx.QueryRow(ctx, `
		SELECT cg.id FROM customization_groups cg
		JOIN product_customization_groups pcg ON cg.id = pcg.group_id
		WHERE pcg.product_id = $1 AND cg.option_type = $2
		LIMIT 1
	`, productID, req.OptionType).Scan(&groupID)

	if err == pgx.ErrNoRows {
		groupName := fmt.Sprintf("商品 %d 的 %s 自動群組", productID, req.OptionType)
		err = tx.QueryRow(ctx, `
			INSERT INTO customization_groups (name, option_type) 
			VALUES ($1, $2) RETURNING id
		`, groupName, req.OptionType).Scan(&groupID)
		if err != nil {
			return nil, err
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO product_customization_groups (product_id, group_id) 
			VALUES ($1, $2)
		`, productID, groupID)
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	var itemID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO customization_items (group_id, name, price_delta, sort_order) 
		VALUES ($1, $2, $3, $4) RETURNING id
	`, groupID, req.Name, req.PriceDelta, req.SortOrder).Scan(&itemID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &model.ProductCustomization{
		ID:         itemID,
		ProductID:  productID,
		OptionType: req.OptionType,
		Name:       req.Name,
		PriceDelta: req.PriceDelta,
		SortOrder:  req.SortOrder,
		IsDisabled: false,
	}, nil
}

func (r *ProductRepository) DeleteCustomization(ctx context.Context, productID, optionID int64) error {
	result, err := r.db.Pool.Exec(ctx, `
		DELETE FROM customization_items 
		WHERE id = $1 AND group_id IN (
			SELECT group_id FROM product_customization_groups WHERE product_id = $2
		)
	`, optionID, productID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanProduct(row pgx.Row) (*model.Product, error) {
	var p model.Product
	err := row.Scan(&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.IsAvailable, &p.CreatedAt)
	if err != nil {
		// 💡 關鍵校正：與上方的 FindByID 保持完全相同的錯誤標籤輸出，徹底消除變數未定義或比對失敗的風險
		if err == pgx.ErrNoRows || strings.Contains(err.Error(), "no rows") {
			return nil, fmt.Errorf("notfound")
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) ListAllGroups(ctx context.Context) ([]model.CustomizationGroup, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT g.id, g.name, g.option_type,
		       COALESCE(i.id, 0), COALESCE(i.name, ''), COALESCE(i.price_delta, 0), COALESCE(i.sort_order, 0)
		FROM customization_groups g
		LEFT JOIN customization_items i ON g.id = i.group_id
		ORDER BY g.id, i.sort_order
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groupMap := map[int64]*model.CustomizationGroup{}
	order := []int64{}
	for rows.Next() {
		var gID int64
		var gName, gType string
		var iID int64
		var iName string
		var iPriceDelta float64
		var iSortOrder int
		if err := rows.Scan(&gID, &gName, &gType, &iID, &iName, &iPriceDelta, &iSortOrder); err != nil {
			return nil, err
		}
		if _, ok := groupMap[gID]; !ok {
			groupMap[gID] = &model.CustomizationGroup{ID: gID, Name: gName, OptionType: gType, Items: []model.CustomizationItem{}}
			order = append(order, gID)
		}
		if iID != 0 {
			groupMap[gID].Items = append(groupMap[gID].Items, model.CustomizationItem{
				ID: iID, GroupID: gID, Name: iName, PriceDelta: iPriceDelta, SortOrder: iSortOrder,
			})
		}
	}
	result := make([]model.CustomizationGroup, 0, len(order))
	for _, gID := range order {
		result = append(result, *groupMap[gID])
	}
	return result, rows.Err()
}

func (r *ProductRepository) GetBoundGroupIDs(ctx context.Context, productID int64) ([]int64, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT group_id FROM product_customization_groups WHERE product_id = $1`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []int64{}
	}
	return ids, rows.Err()
}

func (r *ProductRepository) AddItemToGroup(ctx context.Context, groupID int64, req *model.CreateCustomizationItemRequest) (*model.CustomizationItem, error) {
	var item model.CustomizationItem
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO customization_items (group_id, name, price_delta, sort_order)
		VALUES ($1, $2, $3, $4)
		RETURNING id, group_id, name, price_delta, sort_order
	`, groupID, req.Name, req.PriceDelta, req.SortOrder).Scan(
		&item.ID, &item.GroupID, &item.Name, &item.PriceDelta, &item.SortOrder,
	)
	return &item, err
}

func (r *ProductRepository) DeleteItem(ctx context.Context, itemID int64) error {
	result, err := r.db.Pool.Exec(ctx, `DELETE FROM customization_items WHERE id = $1`, itemID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ProductRepository) UnbindGroup(ctx context.Context, productID, groupID int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		DELETE FROM product_customization_groups WHERE product_id = $1 AND group_id = $2
	`, productID, groupID)
	return err
}

// BindCustomizationGroup 負責將商品與現有的客製化群組進行一鍵綁定
func (r *ProductRepository) BindCustomizationGroup(ctx context.Context, productID, groupID int64) error {
	query := `
		INSERT INTO product_customization_groups (product_id, group_id)
		VALUES ($1, $2)
		ON CONFLICT (product_id, group_id) DO NOTHING; -- 💡 防止重複綁定噴錯
	`
	_, err := r.db.Pool.Exec(ctx, query, productID, groupID)
	return err
}

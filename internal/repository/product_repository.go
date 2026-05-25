package repository

import (
	"context"
	"fmt"

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
	// 💡 加上 COALESCE 保護單一商品查詢
	row := r.db.Pool.QueryRow(ctx,
		`SELECT 
            id, 
            category_id, 
            name, 
            COALESCE(description, '') AS description, 
            price, 
            COALESCE(image_url, '') AS image_url, 
            is_available, 
            created_at 
        FROM products WHERE id = $1`, id)
	return scanProduct(row)
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
	query := `
        SELECT 
            ci.id, 
            pcg.product_id, 
            cg.option_type, 
            ci.name, 
            ci.price_delta, 
            ci.sort_order,
            COALESCE(pcr.is_disabled, false) AS is_disabled
        FROM product_customization_groups pcg
        JOIN customization_groups cg ON pcg.group_id = cg.id
        JOIN customization_items ci ON cg.id = ci.group_id
        LEFT JOIN product_customization_restrictions pcr 
            ON pcr.product_id = pcg.product_id AND pcr.item_id = ci.id
        WHERE pcg.product_id = $1
        ORDER BY cg.option_type, ci.sort_order
    `

	// 💡 關鍵修正：將原本的 var list []model.ProductCustomization 改成這樣
	// 確保即使沒撈到資料，JSON 也會吐出 [] 補償前端，絕對不吐出 null
	list := []model.ProductCustomization{}

	rows, err := r.db.Pool.Query(ctx, query, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var c model.ProductCustomization
		if err := rows.Scan(&c.ID, &c.ProductID, &c.OptionType, &c.Name, &c.PriceDelta, &c.SortOrder, &c.IsDisabled); err != nil {
			return nil, err
		}
		list = append(list, c)
	}

	return list, rows.Err()
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
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	return &p, err
}

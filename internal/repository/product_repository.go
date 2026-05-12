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
	// WHERE 1=1 讓 category_id 和 available 兩個可選條件可以統一用 AND 拼接，
	// 使用 idx 追蹤參數位置以產生正確的 $1, $2... 佔位符。
	query := `SELECT id, category_id, name, description, price, image_url, is_available, created_at FROM products WHERE 1=1`
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
	return products, rows.Err()
}

func (r *ProductRepository) FindByID(ctx context.Context, id int64) (*model.Product, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, category_id, name, description, price, image_url, is_available, created_at FROM products WHERE id = $1`, id)
	return scanProduct(row)
}

func (r *ProductRepository) Create(ctx context.Context, req *model.CreateProductRequest) (*model.Product, error) {
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO products (category_id, name, description, price, image_url) VALUES ($1,$2,$3,$4,$5)
		 RETURNING id, category_id, name, description, price, image_url, is_available, created_at`,
		req.CategoryID, req.Name, req.Description, req.Price, req.ImageURL)
	return scanProduct(row)
}

func (r *ProductRepository) Update(ctx context.Context, id int64, req *model.UpdateProductRequest) (*model.Product, error) {
	// 先讀後寫的 partial update 策略：request 中 nil 的欄位保留原值，
	// 避免 API 呼叫端必須每次傳入所有欄位。
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

	row := r.db.Pool.QueryRow(ctx,
		`UPDATE products SET category_id=$1, name=$2, description=$3, price=$4, image_url=$5 WHERE id=$6
		 RETURNING id, category_id, name, description, price, image_url, is_available, created_at`,
		existing.CategoryID, existing.Name, existing.Description, existing.Price, existing.ImageURL, id)
	return scanProduct(row)
}

func (r *ProductRepository) SetAvailability(ctx context.Context, id int64, available bool) (*model.Product, error) {
	row := r.db.Pool.QueryRow(ctx,
		`UPDATE products SET is_available=$1 WHERE id=$2 RETURNING id, category_id, name, description, price, image_url, is_available, created_at`,
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
	rows, err := r.db.Pool.Query(ctx,
		`SELECT id, product_id, option_type, name, price_delta, sort_order FROM product_customizations WHERE product_id=$1 ORDER BY option_type, sort_order`,
		productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.ProductCustomization
	for rows.Next() {
		var c model.ProductCustomization
		if err := rows.Scan(&c.ID, &c.ProductID, &c.OptionType, &c.Name, &c.PriceDelta, &c.SortOrder); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func (r *ProductRepository) AddCustomization(ctx context.Context, productID int64, req *model.CreateCustomizationRequest) (*model.ProductCustomization, error) {
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO product_customizations (product_id, option_type, name, price_delta, sort_order) VALUES ($1,$2,$3,$4,$5)
		 RETURNING id, product_id, option_type, name, price_delta, sort_order`,
		productID, req.OptionType, req.Name, req.PriceDelta, req.SortOrder)
	var c model.ProductCustomization
	err := row.Scan(&c.ID, &c.ProductID, &c.OptionType, &c.Name, &c.PriceDelta, &c.SortOrder)
	return &c, err
}

func (r *ProductRepository) DeleteCustomization(ctx context.Context, productID, optionID int64) error {
	result, err := r.db.Pool.Exec(ctx,
		`DELETE FROM product_customizations WHERE id=$1 AND product_id=$2`, optionID, productID)
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

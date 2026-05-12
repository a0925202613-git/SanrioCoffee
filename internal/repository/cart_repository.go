package repository

import (
	"context"
	"encoding/json"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

type CartRepository struct {
	db *database.DB
}

func NewCartRepository(db *database.DB) *CartRepository {
	return &CartRepository{db: db}
}

func (r *CartRepository) GetItems(ctx context.Context, userID int64) ([]model.CartItem, error) {
	query := `
		SELECT ci.id, ci.user_id, ci.product_id, p.name, p.price, ci.quantity, ci.customizations, ci.created_at
		FROM cart_items ci
		JOIN products p ON p.id = ci.product_id
		WHERE ci.user_id = $1
		ORDER BY ci.created_at`

	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.CartItem
	for rows.Next() {
		var item model.CartItem
		var customizationsJSON []byte
		if err := rows.Scan(&item.ID, &item.UserID, &item.ProductID, &item.ProductName, &item.ProductPrice, &item.Quantity, &customizationsJSON, &item.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(customizationsJSON, &item.Customizations); err != nil {
			item.Customizations = []model.CartCustomization{}
		}
		// Calculate subtotal
		extra := 0.0
		for _, c := range item.Customizations {
			extra += c.PriceDelta
		}
		item.Subtotal = (item.ProductPrice + extra) * float64(item.Quantity)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *CartRepository) AddItem(ctx context.Context, userID int64, req *model.AddCartItemRequest) (*model.CartItem, error) {
	customizationsJSON, err := json.Marshal(req.Customizations)
	if err != nil {
		return nil, err
	}

	var item model.CartItem
	var customizationsBytes []byte
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO cart_items (user_id, product_id, quantity, customizations) VALUES ($1,$2,$3,$4)
		 RETURNING id, user_id, product_id, quantity, customizations, created_at`,
		userID, req.ProductID, req.Quantity, customizationsJSON)
	err = row.Scan(&item.ID, &item.UserID, &item.ProductID, &item.Quantity, &customizationsBytes, &item.CreatedAt)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(customizationsBytes, &item.Customizations) //nolint:errcheck
	return &item, nil
}

func (r *CartRepository) UpdateItem(ctx context.Context, userID, itemID int64, req *model.UpdateCartItemRequest) error {
	customizationsJSON, err := json.Marshal(req.Customizations)
	if err != nil {
		return err
	}
	result, err := r.db.Pool.Exec(ctx,
		`UPDATE cart_items SET quantity=$1, customizations=$2 WHERE id=$3 AND user_id=$4`,
		req.Quantity, customizationsJSON, itemID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CartRepository) DeleteItem(ctx context.Context, userID, itemID int64) error {
	result, err := r.db.Pool.Exec(ctx, `DELETE FROM cart_items WHERE id=$1 AND user_id=$2`, itemID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ClearCart 在訂單建立事務內清空購物車，保證原子性（訂單失敗時購物車不會被清掉）。
func (r *CartRepository) ClearCart(ctx context.Context, tx pgx.Tx, userID int64) error {
	_, err := tx.Exec(ctx, `DELETE FROM cart_items WHERE user_id=$1`, userID)
	return err
}

// ClearCartDirect 直接透過 pool 清空，供不需事務包覆的場景使用（例如手動清空 API）。
func (r *CartRepository) ClearCartDirect(ctx context.Context, userID int64) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM cart_items WHERE user_id=$1`, userID)
	return err
}

// GetItemsInTx 在事務內讀取購物車，確保建立訂單的整個流程看到一致的購物車狀態。
func (r *CartRepository) GetItemsInTx(ctx context.Context, tx pgx.Tx, userID int64) ([]model.CartItem, error) {
	query := `
		SELECT ci.id, ci.user_id, ci.product_id, p.name, p.price, ci.quantity, ci.customizations, ci.created_at
		FROM cart_items ci
		JOIN products p ON p.id = ci.product_id
		WHERE ci.user_id = $1
		ORDER BY ci.created_at`

	rows, err := tx.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.CartItem
	for rows.Next() {
		var item model.CartItem
		var customizationsJSON []byte
		if err := rows.Scan(&item.ID, &item.UserID, &item.ProductID, &item.ProductName, &item.ProductPrice, &item.Quantity, &customizationsJSON, &item.CreatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(customizationsJSON, &item.Customizations) //nolint:errcheck
		extra := 0.0
		for _, c := range item.Customizations {
			extra += c.PriceDelta
		}
		item.Subtotal = (item.ProductPrice + extra) * float64(item.Quantity)
		items = append(items, item)
	}
	return items, rows.Err()
}

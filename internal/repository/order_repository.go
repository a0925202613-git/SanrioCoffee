package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

type OrderRepository struct {
	db *database.DB
}

func NewOrderRepository(db *database.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) Create(ctx context.Context, tx pgx.Tx, o *model.Order) (*model.Order, error) {
	row := tx.QueryRow(ctx,
		`INSERT INTO orders (user_id, subtotal, discount_amount, points_used, total_price, status, note, pickup_time)
		 VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)
		 RETURNING id, user_id, subtotal, discount_amount, points_used, total_price, status, note, pickup_time, created_at`,
		o.UserID, o.Subtotal, o.DiscountAmount, o.PointsUsed, o.TotalPrice, o.Note, o.PickupTime)
	return scanOrder(row)
}

func (r *OrderRepository) CreateItems(ctx context.Context, tx pgx.Tx, items []model.OrderItem) error {
	for _, item := range items {
		customizationsJSON, err := json.Marshal(item.Customizations)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx,
			`INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, customizations, subtotal)
			 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			item.OrderID, item.ProductID, item.ProductName, item.UnitPrice, item.Quantity, customizationsJSON, item.Subtotal)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *OrderRepository) FindByID(ctx context.Context, id int64) (*model.OrderWithItems, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, user_id, subtotal, discount_amount, points_used, total_price, status, note, pickup_time, created_at FROM orders WHERE id=$1`, id)
	order, err := scanOrder(row)
	if err != nil {
		return nil, err
	}

	items, err := r.listItems(ctx, nil, id)
	if err != nil {
		return nil, err
	}
	return &model.OrderWithItems{Order: *order, Items: items}, nil
}

func (r *OrderRepository) ListByUser(ctx context.Context, userID int64) ([]model.Order, error) {
	rows, err := r.db.Pool.Query(ctx,
		`SELECT id, user_id, subtotal, discount_amount, points_used, total_price, status, note, pickup_time, created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrders(rows)
}

func (r *OrderRepository) ListAll(ctx context.Context, status string) ([]model.Order, error) {
	// WHERE 1=1 讓後續 AND 條件可以統一拼接，不需要判斷是否為第一個條件。
	query := `SELECT id, user_id, subtotal, discount_amount, points_used, total_price, status, note, pickup_time, created_at FROM orders WHERE 1=1`
	args := []interface{}{}
	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", len(args)+1)
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrders(rows)
}

func (r *OrderRepository) UpdateStatus(ctx context.Context, id int64, status string) (*model.Order, error) {
	row := r.db.Pool.QueryRow(ctx,
		`UPDATE orders SET status=$1 WHERE id=$2 RETURNING id, user_id, subtotal, discount_amount, points_used, total_price, status, note, pickup_time, created_at`,
		status, id)
	return scanOrder(row)
}

// UpdateStatusTx 在付款回調事務內更新訂單狀態，與 payment 狀態更新共用同一個 tx，
// 確保「payment 成功」與「order 轉 paid」原子完成，不會出現付款成功但訂單還是 pending 的情況。
func (r *OrderRepository) UpdateStatusTx(ctx context.Context, tx pgx.Tx, id int64, status string) error {
	_, err := tx.Exec(ctx, `UPDATE orders SET status=$1 WHERE id=$2`, status, id)
	return err
}

func (r *OrderRepository) listItems(ctx context.Context, tx pgx.Tx, orderID int64) ([]model.OrderItem, error) {
	query := `SELECT id, order_id, product_id, product_name, unit_price, quantity, customizations, subtotal FROM order_items WHERE order_id=$1`
	var rows pgx.Rows
	var err error
	if tx != nil {
		rows, err = tx.Query(ctx, query, orderID)
	} else {
		rows, err = r.db.Pool.Query(ctx, query, orderID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.OrderItem
	for rows.Next() {
		var item model.OrderItem
		var customizationsJSON []byte
		if err := rows.Scan(&item.ID, &item.OrderID, &item.ProductID, &item.ProductName, &item.UnitPrice, &item.Quantity, &customizationsJSON, &item.Subtotal); err != nil {
			return nil, err
		}
		json.Unmarshal(customizationsJSON, &item.Customizations) //nolint:errcheck
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanOrder(row pgx.Row) (*model.Order, error) {
	var o model.Order
	err := row.Scan(&o.ID, &o.UserID, &o.Subtotal, &o.DiscountAmount, &o.PointsUsed, &o.TotalPrice, &o.Status, &o.Note, &o.PickupTime, &o.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	return &o, err
}

func scanOrders(rows pgx.Rows) ([]model.Order, error) {
	var orders []model.Order
	for rows.Next() {
		var o model.Order
		if err := rows.Scan(&o.ID, &o.UserID, &o.Subtotal, &o.DiscountAmount, &o.PointsUsed, &o.TotalPrice, &o.Status, &o.Note, &o.PickupTime, &o.CreatedAt); err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, rows.Err()
}

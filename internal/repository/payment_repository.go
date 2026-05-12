package repository

import (
	"context"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

type PaymentRepository struct {
	db *database.DB
}

func NewPaymentRepository(db *database.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) Create(ctx context.Context, p *model.Payment) (*model.Payment, error) {
	// ON CONFLICT 僅在舊紀錄是 failed 時才覆寫，允許付款失敗後重試
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO payments (order_id, amount, method, status, transaction_id, paid_at)
		 VALUES ($1,$2,$3,'pending',$4,NULL)
		 ON CONFLICT (order_id) DO UPDATE
		     SET amount=EXCLUDED.amount, method=EXCLUDED.method,
		         status='pending', transaction_id=EXCLUDED.transaction_id, paid_at=NULL
		     WHERE payments.status='failed'
		 RETURNING id, order_id, amount, method, status, transaction_id, paid_at`,
		p.OrderID, p.Amount, p.Method, p.TransactionID)
	return scanPayment(row)
}

func (r *PaymentRepository) FindByTransactionID(ctx context.Context, txID string) (*model.Payment, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, order_id, amount, method, status, transaction_id, paid_at FROM payments WHERE transaction_id=$1`, txID)
	return scanPayment(row)
}

func (r *PaymentRepository) FindByOrderID(ctx context.Context, orderID int64) (*model.Payment, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, order_id, amount, method, status, transaction_id, paid_at FROM payments WHERE order_id=$1`, orderID)
	return scanPayment(row)
}

func (r *PaymentRepository) UpdateStatus(ctx context.Context, tx pgx.Tx, id int64, status, txID string) (*model.Payment, error) {
	// isPaid 作為獨立的 boolean 參數 $4 傳入，避免 PostgreSQL SQLSTATE 42P08：
	// 若直接用 CASE WHEN $1='success'，同一個 $1 會同時被推斷為 payment_status ENUM 和 text，造成型別衝突。
	isPaid := status == "success"
	query := `UPDATE payments SET status=$1, transaction_id=$2, paid_at=CASE WHEN $4 THEN NOW() ELSE NULL END WHERE id=$3
			  RETURNING id, order_id, amount, method, status, transaction_id, paid_at`
	var row pgx.Row
	if tx != nil {
		row = tx.QueryRow(ctx, query, status, txID, id, isPaid)
	} else {
		row = r.db.Pool.QueryRow(ctx, query, status, txID, id, isPaid)
	}
	return scanPayment(row)
}

func scanPayment(row pgx.Row) (*model.Payment, error) {
	var p model.Payment
	err := row.Scan(&p.ID, &p.OrderID, &p.Amount, &p.Method, &p.Status, &p.TransactionID, &p.PaidAt)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	return &p, err
}

package repository

import (
	"context"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

type CouponRepository struct {
	db *database.DB
}

func NewCouponRepository(db *database.DB) *CouponRepository {
	return &CouponRepository{db: db}
}

func (r *CouponRepository) Create(ctx context.Context, req *model.CreateCouponRequest) (*model.Coupon, error) {
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO coupons (code, name, discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_limit)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 RETURNING id, code, name, discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_limit, used_count, is_active`,
		req.Code, req.Name, req.DiscountType, req.DiscountValue, req.MinOrderAmount, req.ValidFrom, req.ValidUntil, req.UsageLimit)
	return scanCoupon(row)
}

func (r *CouponRepository) List(ctx context.Context) ([]model.Coupon, error) {
	rows, err := r.db.Pool.Query(ctx,
		`SELECT id, code, name, discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_limit, used_count, is_active FROM coupons ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var coupons []model.Coupon
	for rows.Next() {
		var c model.Coupon
		if err := rows.Scan(&c.ID, &c.Code, &c.Name, &c.DiscountType, &c.DiscountValue, &c.MinOrderAmount, &c.ValidFrom, &c.ValidUntil, &c.UsageLimit, &c.UsedCount, &c.IsActive); err != nil {
			return nil, err
		}
		coupons = append(coupons, c)
	}
	return coupons, rows.Err()
}

func (r *CouponRepository) FindByCode(ctx context.Context, code string) (*model.Coupon, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT id, code, name, discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_limit, used_count, is_active FROM coupons WHERE code=$1`, code)
	return scanCoupon(row)
}

// FindByCodeForUpdate 在事務內以 SELECT FOR UPDATE 鎖定列，
// 防止兩個並發請求同時通過 usage_limit 檢查後各自 +1，造成超用。
func (r *CouponRepository) FindByCodeForUpdate(ctx context.Context, tx pgx.Tx, code string) (*model.Coupon, error) {
	row := tx.QueryRow(ctx,
		`SELECT id, code, name, discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_limit, used_count, is_active FROM coupons WHERE code=$1 FOR UPDATE`, code)
	return scanCoupon(row)
}

func (r *CouponRepository) IncrementUsed(ctx context.Context, tx pgx.Tx, couponID int64) error {
	_, err := tx.Exec(ctx, `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`, couponID)
	return err
}

// RecordUserCoupon 記錄使用者已使用此優惠券；ON CONFLICT DO NOTHING 確保冪等，
// 讓重試的請求不會因重複 insert 而失敗。
func (r *CouponRepository) RecordUserCoupon(ctx context.Context, tx pgx.Tx, userID, couponID int64) error {
	_, err := tx.Exec(ctx, `INSERT INTO user_coupons (user_id, coupon_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, userID, couponID)
	return err
}

func (r *CouponRepository) SetActive(ctx context.Context, id int64, active bool) (*model.Coupon, error) {
	row := r.db.Pool.QueryRow(ctx,
		`UPDATE coupons SET is_active=$1 WHERE id=$2 RETURNING id, code, name, discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_limit, used_count, is_active`,
		active, id)
	return scanCoupon(row)
}

func (r *CouponRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.Pool.Exec(ctx, `DELETE FROM coupons WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CouponRepository) ListPointTransactions(ctx context.Context, userID int64) ([]model.PointTransaction, error) {
	rows, err := r.db.Pool.Query(ctx,
		`SELECT id, user_id, points_delta, type, order_id, description, created_at FROM point_transactions WHERE user_id=$1 ORDER BY created_at DESC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []model.PointTransaction
	for rows.Next() {
		var pt model.PointTransaction
		if err := rows.Scan(&pt.ID, &pt.UserID, &pt.PointsDelta, &pt.Type, &pt.OrderID, &pt.Description, &pt.CreatedAt); err != nil {
			return nil, err
		}
		txs = append(txs, pt)
	}
	return txs, rows.Err()
}

func (r *CouponRepository) AddPointTransaction(ctx context.Context, tx pgx.Tx, pt *model.PointTransaction) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO point_transactions (user_id, points_delta, type, order_id, description) VALUES ($1,$2,$3,$4,$5)`,
		pt.UserID, pt.PointsDelta, pt.Type, pt.OrderID, pt.Description)
	return err
}

func scanCoupon(row pgx.Row) (*model.Coupon, error) {
	var c model.Coupon
	err := row.Scan(&c.ID, &c.Code, &c.Name, &c.DiscountType, &c.DiscountValue, &c.MinOrderAmount, &c.ValidFrom, &c.ValidUntil, &c.UsageLimit, &c.UsedCount, &c.IsActive)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	return &c, err
}

package repository

import (
	"context"
	"database/sql"
	"errors"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/pkg/database"
)

type GiftRepository struct {
	db *database.DB
}

func NewGiftRepository(db *database.DB) *GiftRepository {
	return &GiftRepository{db: db}
}

// Create 儲存新的禮物紀錄
func (r *GiftRepository) Create(ctx context.Context, gift *model.Gift) error {
	query := `
		INSERT INTO gifts (sender_id, order_id, gift_code, status, message, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query,
		gift.SenderID,
		gift.OrderID,
		gift.GiftCode,
		gift.Status,
		gift.Message,
		gift.CreatedAt,
	).Scan(&gift.ID)
}

// GetByCode 透過兌換碼查詢禮物
func (r *GiftRepository) GetByCode(ctx context.Context, code string) (*model.Gift, error) {
	query := `
		SELECT id, sender_id, order_id, gift_code, receiver_id, status, message, claimed_at, created_at
		FROM gifts WHERE gift_code = $1
	`
	var gift model.Gift
	err := r.db.Pool.QueryRow(ctx, query, code).Scan(
		&gift.ID,
		&gift.SenderID,
		&gift.OrderID,
		&gift.GiftCode,
		&gift.ReceiverID,
		&gift.Status,
		&gift.Message,
		&gift.ClaimedAt,
		&gift.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &gift, nil
}

// GetByReceiver 查詢某人收到的所有禮物
func (r *GiftRepository) GetByReceiver(ctx context.Context, userID int64) ([]*model.Gift, error) {
	query := `
        SELECT id, sender_id, order_id, gift_code, receiver_id, status, message, claimed_at, created_at
        FROM gifts 
		WHERE receiver_id = $1
        ORDER BY created_at DESC
    `
	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var gifts []*model.Gift
	for rows.Next() {
		var g model.Gift
		err := rows.Scan(&g.ID, &g.SenderID, &g.OrderID, &g.GiftCode, &g.ReceiverID, &g.Status, &g.Message, &g.ClaimedAt, &g.CreatedAt)
		if err != nil {
			return nil, err
		}
		gifts = append(gifts, &g)
	}
	return gifts, nil
}

func (r *GiftRepository) UpdateAndTransferOrder(ctx context.Context, gift *model.Gift) error {
	// 1. 開啟事務 (使用 pgx 的 Begin)
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}

	// pgx 的 Rollback 需要傳入 ctx
	defer tx.Rollback(ctx)

	// 2. 更新禮物紀錄
	updateGiftQuery := `
        UPDATE gifts 
        SET receiver_id = $1, status = $2, claimed_at = $3
        WHERE id = $4 AND status = 'pending' -- 確保只有未被領取的禮物能被更新
    `

	// pgx 直接使用 tx.Exec，並將 ctx 作為第一個參數
	commandTag, err := tx.Exec(ctx, updateGiftQuery,
		gift.ReceiverID,
		gift.Status,
		gift.ClaimedAt,
		gift.ID,
	)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return errors.New("禮物已被領取或狀態異常")
	}

	// 3. 轉移訂單擁有權給收禮人
	updateOrderQuery := `
        UPDATE orders 
        SET user_id = $1 
        WHERE id = $2
    `
	_, err = tx.Exec(ctx, updateOrderQuery,
		gift.ReceiverID,
		gift.OrderID,
	)
	if err != nil {
		return err
	}

	// 4. 提交事務 (pgx 的 Commit 需要傳入 ctx)
	if err = tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

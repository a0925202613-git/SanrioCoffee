package repository

import (
	"context"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

type UserRepository struct {
	db *database.DB
}

func NewUserRepository(db *database.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, u *model.User, passwordHash string) (*model.User, error) {
	query := `
		INSERT INTO users (username, email, password_hash, phone, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, username, email, phone, role, points, created_at`

	row := r.db.Pool.QueryRow(ctx, query, u.Username, u.Email, passwordHash, u.Phone, u.Role)
	return scanUser(row)
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*model.User, string, error) {
	query := `SELECT id, username, email, password_hash, phone, role, points, created_at FROM users WHERE email = $1`
	row := r.db.Pool.QueryRow(ctx, query, email)

	var u model.User
	var hash string
	err := row.Scan(&u.ID, &u.Username, &u.Email, &hash, &u.Phone, &u.Role, &u.Points, &u.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, "", ErrNotFound
	}
	if err != nil {
		return nil, "", err
	}
	return &u, hash, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id int64) (*model.User, error) {
	query := `SELECT id, username, email, phone, role, points, created_at FROM users WHERE id = $1`
	row := r.db.Pool.QueryRow(ctx, query, id)
	return scanUser(row)
}

func (r *UserRepository) UpdatePoints(ctx context.Context, tx pgx.Tx, userID int64, delta int) error {
	_, err := tx.Exec(ctx, `UPDATE users SET points = points + $1 WHERE id = $2`, delta, userID)
	return err
}

// FindByIDForUpdate 在事務內以 SELECT FOR UPDATE 鎖定使用者列，
// 確保點數扣除（points_to_redeem）不受並發請求影響，讀到的點數餘額是最新且排他的。
func (r *UserRepository) FindByIDForUpdate(ctx context.Context, tx pgx.Tx, id int64) (*model.User, error) {
	query := `SELECT id, username, email, phone, role, points, created_at FROM users WHERE id = $1 FOR UPDATE`
	row := tx.QueryRow(ctx, query, id)
	return scanUser(row)
}

func scanUser(row pgx.Row) (*model.User, error) {
	var u model.User
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.Phone, &u.Role, &u.Points, &u.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	return &u, err
}

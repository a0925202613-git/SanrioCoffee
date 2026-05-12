package repository

import (
	"context"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

type CategoryRepository struct {
	db *database.DB
}

func NewCategoryRepository(db *database.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) List(ctx context.Context) ([]model.Category, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, name, description, sort_order, is_active FROM categories ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.SortOrder, &c.IsActive); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (r *CategoryRepository) FindByID(ctx context.Context, id int64) (*model.Category, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT id, name, description, sort_order, is_active FROM categories WHERE id = $1`, id)
	var c model.Category
	err := row.Scan(&c.ID, &c.Name, &c.Description, &c.SortOrder, &c.IsActive)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	return &c, err
}

func (r *CategoryRepository) Create(ctx context.Context, req *model.CreateCategoryRequest) (*model.Category, error) {
	row := r.db.Pool.QueryRow(ctx,
		`INSERT INTO categories (name, description, sort_order) VALUES ($1, $2, $3) RETURNING id, name, description, sort_order, is_active`,
		req.Name, req.Description, req.SortOrder)
	var c model.Category
	err := row.Scan(&c.ID, &c.Name, &c.Description, &c.SortOrder, &c.IsActive)
	return &c, err
}

func (r *CategoryRepository) Update(ctx context.Context, id int64, req *model.UpdateCategoryRequest) (*model.Category, error) {
	existing, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.SortOrder != nil {
		existing.SortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}

	row := r.db.Pool.QueryRow(ctx,
		`UPDATE categories SET name=$1, description=$2, sort_order=$3, is_active=$4 WHERE id=$5 RETURNING id, name, description, sort_order, is_active`,
		existing.Name, existing.Description, existing.SortOrder, existing.IsActive, id)
	var c model.Category
	err = row.Scan(&c.ID, &c.Name, &c.Description, &c.SortOrder, &c.IsActive)
	return &c, err
}

func (r *CategoryRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.Pool.Exec(ctx, `DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

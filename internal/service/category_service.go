package service

import (
	"context"
	"encoding/json"
	"time"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"

	"github.com/redis/go-redis/v9"
)

type CategoryService struct {
	repo        *repository.CategoryRepository
	redisClient *redis.Client
}

func NewCategoryService(repo *repository.CategoryRepository, redisClient *redis.Client) *CategoryService {
	return &CategoryService{repo: repo, redisClient: redisClient}
}

const categoryCacheKey = "categories:list"

func (s *CategoryService) List(ctx context.Context) ([]model.Category, error) {
	if s.redisClient != nil {
		if data, err := s.redisClient.Get(ctx, categoryCacheKey).Bytes(); err == nil {
			var cats []model.Category
			if json.Unmarshal(data, &cats) == nil {
				return cats, nil
			}
		}
	}

	cats, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}

	if s.redisClient != nil {
		if data, err := json.Marshal(cats); err == nil {
			s.redisClient.Set(ctx, categoryCacheKey, data, 10*time.Minute) //nolint:errcheck
		}
	}
	return cats, nil
}

func (s *CategoryService) GetByID(ctx context.Context, id int64) (*model.Category, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *CategoryService) Create(ctx context.Context, req *model.CreateCategoryRequest) (*model.Category, error) {
	cat, err := s.repo.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	s.invalidateCache(ctx)
	return cat, nil
}

func (s *CategoryService) Update(ctx context.Context, id int64, req *model.UpdateCategoryRequest) (*model.Category, error) {
	cat, err := s.repo.Update(ctx, id, req)
	if err != nil {
		return nil, err
	}
	s.invalidateCache(ctx)
	return cat, nil
}

func (s *CategoryService) Delete(ctx context.Context, id int64) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

func (s *CategoryService) invalidateCache(ctx context.Context) {
	if s.redisClient != nil {
		s.redisClient.Del(ctx, categoryCacheKey) //nolint:errcheck
	}
}

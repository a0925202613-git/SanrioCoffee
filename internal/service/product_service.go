package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"

	"github.com/redis/go-redis/v9"
)

type ProductService struct {
	repo        *repository.ProductRepository
	redisClient *redis.Client
}

func NewProductService(repo *repository.ProductRepository, redisClient *redis.Client) *ProductService {
	return &ProductService{repo: repo, redisClient: redisClient}
}

func (s *ProductService) List(ctx context.Context, categoryID int64, availableOnly bool) ([]model.Product, error) {
	cacheKey := fmt.Sprintf("products:list:%d:%v", categoryID, availableOnly)
	if s.redisClient != nil {
		if data, err := s.redisClient.Get(ctx, cacheKey).Bytes(); err == nil {
			var products []model.Product
			if json.Unmarshal(data, &products) == nil {
				return products, nil
			}
		}
	}

	products, err := s.repo.List(ctx, categoryID, availableOnly)
	if err != nil {
		return nil, err
	}

	if s.redisClient != nil {
		if data, err := json.Marshal(products); err == nil {
			s.redisClient.Set(ctx, cacheKey, data, 5*time.Minute)
		}
	}
	return products, nil
}

func (s *ProductService) GetByID(ctx context.Context, id int64) (*model.ProductWithCustomizations, error) {
	cacheKey := fmt.Sprintf("product:%d", id)
	if s.redisClient != nil {
		if data, err := s.redisClient.Get(ctx, cacheKey).Bytes(); err == nil {
			var p model.ProductWithCustomizations
			if json.Unmarshal(data, &p) == nil {
				return &p, nil
			}
		}
	}

	product, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	customizations, err := s.repo.ListCustomizations(ctx, id)
	if err != nil {
		return nil, err
	}

	result := &model.ProductWithCustomizations{
		Product:        *product,
		Customizations: customizations,
	}

	if s.redisClient != nil {
		if data, err := json.Marshal(result); err == nil {
			s.redisClient.Set(ctx, cacheKey, data, 5*time.Minute)
		}
	}
	return result, nil
}

func (s *ProductService) Create(ctx context.Context, req *model.CreateProductRequest) (*model.Product, error) {
	p, err := s.repo.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	s.invalidateListCache(ctx)
	return p, nil
}

func (s *ProductService) Update(ctx context.Context, id int64, req *model.UpdateProductRequest) (*model.Product, error) {
	p, err := s.repo.Update(ctx, id, req)
	if err != nil {
		return nil, err
	}
	s.invalidateProductCache(ctx, id)
	return p, nil
}

func (s *ProductService) SetAvailability(ctx context.Context, id int64, available bool) (*model.Product, error) {
	p, err := s.repo.SetAvailability(ctx, id, available)
	if err != nil {
		return nil, err
	}
	s.invalidateProductCache(ctx, id)
	return p, nil
}

func (s *ProductService) Delete(ctx context.Context, id int64) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.invalidateProductCache(ctx, id)
	return nil
}

func (s *ProductService) GetCustomizations(ctx context.Context, productID int64) ([]model.ProductCustomization, error) {
	return s.repo.ListCustomizations(ctx, productID)
}

func (s *ProductService) AddCustomization(ctx context.Context, productID int64, req *model.CreateCustomizationRequest) (*model.ProductCustomization, error) {
	c, err := s.repo.AddCustomization(ctx, productID, req)
	if err != nil {
		return nil, err
	}
	s.invalidateProductCache(ctx, productID)
	return c, nil
}

func (s *ProductService) DeleteCustomization(ctx context.Context, productID, optionID int64) error {
	if err := s.repo.DeleteCustomization(ctx, productID, optionID); err != nil {
		return err
	}
	s.invalidateProductCache(ctx, productID)
	return nil
}

func (s *ProductService) invalidateProductCache(ctx context.Context, id int64) {
	if s.redisClient == nil {
		return
	}
	s.redisClient.Del(ctx, fmt.Sprintf("product:%d", id))
	s.invalidateListCache(ctx)
}

func (s *ProductService) invalidateListCache(ctx context.Context) {
	if s.redisClient == nil {
		return
	}
	keys, _ := s.redisClient.Keys(ctx, "products:list:*").Result()
	if len(keys) > 0 {
		s.redisClient.Del(ctx, keys...)
	}
}

// AddCustomizationRestriction 負責設定黑名單限制，並在完成後清除 Redis 商品快取
func (s *ProductService) AddCustomizationRestriction(ctx context.Context, productID, itemID int64, isDisabled bool) error {
	err := s.repo.AddCustomizationRestriction(ctx, productID, itemID, isDisabled)
	if err != nil {
		return err
	}
	// 🧹 成功後自動清除 Redis 快取，確保前端拿到最新反灰狀態
	s.invalidateProductCache(ctx, productID)
	return nil
}

func (s *ProductService) ListAllGroups(ctx context.Context) ([]model.CustomizationGroup, error) {
	return s.repo.ListAllGroups(ctx)
}

func (s *ProductService) GetBoundGroupIDs(ctx context.Context, productID int64) ([]int64, error) {
	return s.repo.GetBoundGroupIDs(ctx, productID)
}

func (s *ProductService) AddItemToGroup(ctx context.Context, groupID int64, req *model.CreateCustomizationItemRequest) (*model.CustomizationItem, error) {
	return s.repo.AddItemToGroup(ctx, groupID, req)
}

func (s *ProductService) DeleteItem(ctx context.Context, itemID int64) error {
	return s.repo.DeleteItem(ctx, itemID)
}

func (s *ProductService) UnbindGroup(ctx context.Context, productID, groupID int64) error {
	if err := s.repo.UnbindGroup(ctx, productID, groupID); err != nil {
		return err
	}
	s.invalidateProductCache(ctx, productID)
	return nil
}

// BindCustomizationGroup 處理商品綁定現有群組，並清除 Redis 快取
func (s *ProductService) BindCustomizationGroup(ctx context.Context, productID, groupID int64) error {
	err := s.repo.BindCustomizationGroup(ctx, productID, groupID)
	if err != nil {
		return err
	}
	// 清除快取，讓前端下一秒拿到的選單立刻多出這個群組
	s.invalidateProductCache(ctx, productID)
	return nil
}

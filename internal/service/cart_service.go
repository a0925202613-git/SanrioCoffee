package service

import (
	"context"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
)

type CartService struct {
	cartRepo    *repository.CartRepository
	productRepo *repository.ProductRepository
}

func NewCartService(cartRepo *repository.CartRepository, productRepo *repository.ProductRepository) *CartService {
	return &CartService{cartRepo: cartRepo, productRepo: productRepo}
}

func (s *CartService) GetCart(ctx context.Context, userID int64) (*model.CartResponse, error) {
	items, err := s.cartRepo.GetItems(ctx, userID)
	if err != nil {
		return nil, err
	}

	totalPrice := 0.0
	for _, item := range items {
		totalPrice += item.Subtotal
	}

	return &model.CartResponse{
		Items:      items,
		TotalItems: len(items),
		TotalPrice: totalPrice,
	}, nil
}

func (s *CartService) AddItem(ctx context.Context, userID int64, req *model.AddCartItemRequest) (*model.CartItem, error) {
	// Verify product exists and is available
	product, err := s.productRepo.FindByID(ctx, req.ProductID)
	if err != nil {
		return nil, err
	}
	if !product.IsAvailable {
		return nil, ErrProductUnavailable
	}

	return s.cartRepo.AddItem(ctx, userID, req)
}

func (s *CartService) UpdateItem(ctx context.Context, userID, itemID int64, req *model.UpdateCartItemRequest) error {
	return s.cartRepo.UpdateItem(ctx, userID, itemID, req)
}

func (s *CartService) DeleteItem(ctx context.Context, userID, itemID int64) error {
	return s.cartRepo.DeleteItem(ctx, userID, itemID)
}

func (s *CartService) ClearCart(ctx context.Context, userID int64) error {
	return s.cartRepo.ClearCartDirect(ctx, userID)
}

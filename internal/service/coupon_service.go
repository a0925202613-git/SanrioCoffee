package service

import (
	"context"
	"time"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
)

type CouponService struct {
	repo *repository.CouponRepository
}

func NewCouponService(repo *repository.CouponRepository) *CouponService {
	return &CouponService{repo: repo}
}

func (s *CouponService) Create(ctx context.Context, req *model.CreateCouponRequest) (*model.Coupon, error) {
	return s.repo.Create(ctx, req)
}

func (s *CouponService) List(ctx context.Context) ([]model.Coupon, error) {
	return s.repo.List(ctx)
}

func (s *CouponService) Validate(ctx context.Context, req *model.ValidateCouponRequest) (*model.ValidateCouponResponse, error) {
	coupon, err := s.repo.FindByCode(ctx, req.Code)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if !coupon.IsActive {
		return nil, ErrInvalidCoupon("coupon is inactive")
	}
	if now.Before(coupon.ValidFrom) || now.After(coupon.ValidUntil) {
		return nil, ErrInvalidCoupon("coupon is expired or not yet valid")
	}

	discount, err := calcDiscount(coupon, req.OrderTotal)
	if err != nil {
		return nil, err
	}

	return &model.ValidateCouponResponse{
		Coupon:         *coupon,
		DiscountAmount: discount,
	}, nil
}

func (s *CouponService) SetActive(ctx context.Context, id int64, active bool) (*model.Coupon, error) {
	return s.repo.SetActive(ctx, id, active)
}

func (s *CouponService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

type CouponError string

func (e CouponError) Error() string { return string(e) }

func ErrInvalidCoupon(msg string) CouponError { return CouponError(msg) }

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

// Validate 驗證優惠券：額外接收 userID，並阻斷重複使用的使用者
func (s *CouponService) Validate(ctx context.Context, userID int64, req *model.ValidateCouponRequest) (*model.ValidateCouponResponse, error) {
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

	// 💡 關鍵防刷防禦：檢查這個人是不是早就用過這張優惠券了
	used, err := s.repo.CheckUserCouponUsed(ctx, userID, coupon.ID)
	if err != nil {
		return nil, err
	}
	if used {
		return nil, ErrInvalidCoupon("您已經使用過此優惠券，每人限用一次")
	}

	// 計算折扣（維持你原有的 calcDiscount 邏輯，如果它需要外部傳入的話）
	discount, err := calcDiscount(coupon, req.OrderTotal)
	if err != nil {
		return nil, err
	}

	return &model.ValidateCouponResponse{
		Coupon:         *coupon,
		DiscountAmount: discount,
	}, nil
}

func (s *CouponService) GetMyCoupons(ctx context.Context, userID int64) ([]model.Coupon, error) {
	return s.repo.ListAvailableCouponsForUser(ctx, userID)
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

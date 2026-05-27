package model

import "time"

type Coupon struct {
	ID             int64     `json:"id"`
	Code           string    `json:"code"`
	Name           string    `json:"name"`
	DiscountType   string    `json:"discount_type"` // percentage | fixed
	DiscountValue  float64   `json:"discount_value"`
	MinOrderAmount float64   `json:"min_order_amount"`
	ValidFrom      time.Time `json:"valid_from"`
	ValidUntil     time.Time `json:"valid_until"`
	UsageLimit     *int      `json:"usage_limit"`
	UsedCount      int       `json:"used_count"`
	IsActive       bool      `json:"is_active"`
}

type CreateCouponRequest struct {
	Code           string    `json:"code"            binding:"required,min=3,max=50"`
	Name           string    `json:"name"            binding:"required"`
	DiscountType   string    `json:"discount_type"   binding:"required,oneof=percentage fixed"`
	DiscountValue  float64   `json:"discount_value"  binding:"required,min=0.01"`
	MinOrderAmount float64   `json:"min_order_amount" binding:"min=0"`
	ValidFrom      time.Time `json:"valid_from"      binding:"required"`
	ValidUntil     time.Time `json:"valid_until"     binding:"required"`
	UsageLimit     *int      `json:"usage_limit"`
}

type ValidateCouponRequest struct {
	Code       string  `json:"code"        binding:"required"`
	OrderTotal float64 `json:"order_total" binding:"min=0"`
}

type ValidateCouponResponse struct {
	Coupon         Coupon  `json:"coupon"`
	DiscountAmount float64 `json:"discount_amount"`
}

type PointTransaction struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	PointsDelta int       `json:"points_delta"`
	Type        string    `json:"type"` // earn | redeem
	OrderID     *int64    `json:"order_id,omitempty"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type PointsResponse struct {
	CurrentPoints int                `json:"current_points"`
	Transactions  []PointTransaction `json:"transactions"`
}

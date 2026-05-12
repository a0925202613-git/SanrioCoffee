package model

import "time"

type Order struct {
	ID             int64     `json:"id"`
	UserID         int64     `json:"user_id"`
	Subtotal       float64   `json:"subtotal"`
	DiscountAmount float64   `json:"discount_amount"`
	PointsUsed     int       `json:"points_used"`
	TotalPrice     float64   `json:"total_price"`
	Status         string    `json:"status"`
	Note           string    `json:"note"`
	PickupTime     *time.Time `json:"pickup_time,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type OrderItem struct {
	ID             int64               `json:"id"`
	OrderID        int64               `json:"order_id"`
	ProductID      int64               `json:"product_id"`
	ProductName    string              `json:"product_name"`
	UnitPrice      float64             `json:"unit_price"`
	Quantity       int                 `json:"quantity"`
	Customizations []CartCustomization `json:"customizations"`
	Subtotal       float64             `json:"subtotal"`
}

type OrderWithItems struct {
	Order
	Items []OrderItem `json:"items"`
}

type CreateOrderRequest struct {
	CouponCode  string     `json:"coupon_code"`
	PointsToUse int        `json:"points_to_use" binding:"min=0"`
	Note        string     `json:"note"`
	PickupTime  *time.Time `json:"pickup_time"`
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=preparing ready completed"`
}

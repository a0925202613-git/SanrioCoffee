package model

import "time"

type CartCustomization struct {
	OptionType string  `json:"option_type"`
	Name       string  `json:"name"`
	PriceDelta float64 `json:"price_delta"`
}

type CartItem struct {
	ID             int64               `json:"id"`
	UserID         int64               `json:"user_id"`
	ProductID      int64               `json:"product_id"`
	ProductName    string              `json:"product_name"`
	ProductPrice   float64             `json:"product_price"`
	Quantity       int                 `json:"quantity"`
	Customizations []CartCustomization `json:"customizations"`
	Subtotal       float64             `json:"subtotal"`
	CreatedAt      time.Time           `json:"created_at"`
}

type CartResponse struct {
	Items      []CartItem `json:"items"`
	TotalItems int        `json:"total_items"`
	TotalPrice float64    `json:"total_price"`
}

type AddCartItemRequest struct {
	ProductID      int64               `json:"product_id"     binding:"required"`
	Quantity       int                 `json:"quantity"       binding:"required,min=1"`
	Customizations []CartCustomization `json:"customizations"`
}

type UpdateCartItemRequest struct {
	Quantity       int                 `json:"quantity"       binding:"required,min=1"`
	Customizations []CartCustomization `json:"customizations"`
}

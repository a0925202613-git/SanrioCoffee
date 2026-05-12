package model

import "time"

type Product struct {
	ID          int64     `json:"id"`
	CategoryID  int64     `json:"category_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	ImageURL    string    `json:"image_url"`
	IsAvailable bool      `json:"is_available"`
	CreatedAt   time.Time `json:"created_at"`
}

type ProductWithCustomizations struct {
	Product
	Customizations []ProductCustomization `json:"customizations"`
}

type ProductCustomization struct {
	ID         int64   `json:"id"`
	ProductID  int64   `json:"product_id"`
	OptionType string  `json:"option_type"` // size | ice | sugar | addon
	Name       string  `json:"name"`
	PriceDelta float64 `json:"price_delta"`
	SortOrder  int     `json:"sort_order"`
}

type CreateProductRequest struct {
	CategoryID  int64   `json:"category_id"  binding:"required"`
	Name        string  `json:"name"         binding:"required,min=1,max=255"`
	Description string  `json:"description"`
	Price       float64 `json:"price"        binding:"required,min=0"`
	ImageURL    string  `json:"image_url"`
}

type UpdateProductRequest struct {
	CategoryID  *int64   `json:"category_id"`
	Name        *string  `json:"name"  binding:"omitempty,min=1,max=255"`
	Description *string  `json:"description"`
	Price       *float64 `json:"price" binding:"omitempty,min=0"`
	ImageURL    *string  `json:"image_url"`
}

type CreateCustomizationRequest struct {
	OptionType string  `json:"option_type" binding:"required,oneof=size ice sugar addon"`
	Name       string  `json:"name"        binding:"required,min=1,max=100"`
	PriceDelta float64 `json:"price_delta"`
	SortOrder  int     `json:"sort_order"`
}

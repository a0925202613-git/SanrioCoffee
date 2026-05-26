package main

import (
	"sanrio-coffee-api/internal/handler"
	"sanrio-coffee-api/pkg/middleware"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth     *handler.AuthHandler
	Category *handler.CategoryHandler
	Product  *handler.ProductHandler
	Cart     *handler.CartHandler
	Order    *handler.OrderHandler
	Payment  *handler.PaymentHandler
	Coupon   *handler.CouponHandler
	Member   *handler.MemberHandler
	Gift     *handler.GiftHandler
}

func RegisterRoutes(r *gin.Engine, jwtSecret string, h *Handlers) {
	api := r.Group("/api/v1")

	// Static file serving
	r.Static("/uploads", "./static/uploads")

	// Public routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", h.Auth.Register)
		auth.POST("/login", h.Auth.Login)
		auth.POST("/forgot-password", h.Auth.ForgotPassword)
		auth.POST("/reset-password", h.Auth.ResetPassword)

	}

	// Public read routes
	api.GET("/categories", h.Category.List)
	api.GET("/products", h.Product.List)
	api.GET("/products/:id", h.Product.GetByID)
	api.GET("/products/:id/customizations", h.Product.GetCustomizations)

	// Mock payment callback (no auth needed for webhook simulation)
	// 模擬第三方支付回傳付款結果時，第三方會直接呼叫這個 endpoint，所以不需要驗證 JWT
	api.POST("/payments/callback", h.Payment.Callback)
	api.GET("/payments/callback", h.Payment.Callback)

	// Protected routes
	authRequired := api.Group("")
	authRequired.Use(middleware.AuthMiddleware(jwtSecret))
	{
		authRequired.GET("/me", h.Auth.Me)
		authRequired.GET("/me/points", h.Member.GetPoints)

		// Admin-only: category management
		adminCat := authRequired.Group("/categories")
		adminCat.Use(middleware.AdminOnly)
		{
			adminCat.POST("", h.Category.Create)
			adminCat.PUT("/:id", h.Category.Update)
			adminCat.DELETE("/:id", h.Category.Delete)
		}

		// Admin-only: product management
		adminProd := authRequired.Group("/products")
		adminProd.Use(middleware.AdminOnly)
		{
			adminProd.POST("", h.Product.Create)
			adminProd.PUT("/:id", h.Product.Update)
			adminProd.PATCH("/:id/availability", h.Product.SetAvailability)
			adminProd.DELETE("/:id", h.Product.Delete)
			adminProd.POST("/:id/customizations", h.Product.AddCustomization)
			adminProd.POST("/:id/restrictions", h.Product.AddRestriction)
			adminProd.POST("/:id/customization-groups", h.Product.BindGroup)
			adminProd.DELETE("/:id/customizations/:optionId", h.Product.DeleteCustomization)
			adminProd.POST("/upload", h.Product.Upload)
		}

		// Cart (consumer)
		cart := authRequired.Group("/cart")
		cart.Use(middleware.ConsumerOnly)
		{
			cart.GET("", h.Cart.GetCart)
			cart.POST("/items", h.Cart.AddItem)
			cart.PUT("/items/:id", h.Cart.UpdateItem)
			cart.DELETE("/items/:id", h.Cart.DeleteItem)
			cart.DELETE("", h.Cart.ClearCart)
		}

		// Orders (both roles, logic differs internally)
		orders := authRequired.Group("/orders")
		{
			orders.GET("", h.Order.ListOrders)
			orders.GET("/:id", h.Order.GetOrder)
			orders.POST("", h.Order.CreateOrder)
			orders.PATCH("/:id/status", h.Order.UpdateStatus)
			orders.PATCH("/:id/cancel", h.Order.CancelOrder)
		}

		// Payments
		payments := authRequired.Group("/payments")
		{
			payments.POST("/initiate", h.Payment.Initiate)
			payments.GET("/:orderId/status", h.Payment.GetStatus)
		}

		// Coupons
		coupons := authRequired.Group("/coupons")
		{
			coupons.POST("/validate", h.Coupon.Validate)
		}
		adminCoupons := authRequired.Group("/coupons")
		adminCoupons.Use(middleware.AdminOnly)
		{
			adminCoupons.POST("", h.Coupon.Create)
			adminCoupons.GET("", h.Coupon.List)
			adminCoupons.PATCH("/:id", h.Coupon.SetActive)
			adminCoupons.DELETE("/:id", h.Coupon.Delete)
		}

		// Gifts (Sanrio Gift Exchange)
		gifts := authRequired.Group("/gifts")
		{
			// A 客人：購買後把訂單轉換成禮物，或直接發起送禮
			gifts.POST("/send", h.Gift.SendGift)

			// B 客人：查看自己收到的禮物清單
			gifts.GET("/received", h.Gift.ListReceivedGifts)

			// B 客人：輸入代碼領取禮物
			gifts.POST("/claim", h.Gift.ClaimGift)
		}

	}
}

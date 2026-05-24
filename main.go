package main

import (
	"fmt"
	"log"
	"os"

	"sanrio-coffee-api/config"
	"sanrio-coffee-api/internal/handler"
	"sanrio-coffee-api/internal/repository"
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/database"
	"sanrio-coffee-api/pkg/email"
	"sanrio-coffee-api/pkg/logger"
	redispkg "sanrio-coffee-api/pkg/redis"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	if err := logger.Init(cfg.Server.Mode); err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	defer logger.Log.Sync() //nolint:errcheck

	db, err := database.NewDB(cfg.Database)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	redisClient := redispkg.NewClient(cfg.Redis)
	mailer := email.NewSendGridMailer(cfg.Email.ApiKey, cfg.Email.FromEmail)

	// Repositories
	userRepo := repository.NewUserRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	productRepo := repository.NewProductRepository(db)
	cartRepo := repository.NewCartRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	paymentRepo := repository.NewPaymentRepository(db)
	couponRepo := repository.NewCouponRepository(db)
	giftRepo := repository.NewGiftRepository(db)

	// Services
	authSvc := service.NewAuthService(userRepo, redisClient, mailer, cfg.JWT.Secret, cfg.JWT.ExpireHours)
	categorySvc := service.NewCategoryService(categoryRepo, redisClient)
	productSvc := service.NewProductService(productRepo, redisClient)
	cartSvc := service.NewCartService(cartRepo, productRepo)
	orderSvc := service.NewOrderService(db, cartRepo, orderRepo, userRepo, couponRepo)
	paymentSvc := service.NewPaymentService(db, paymentRepo, orderRepo, userRepo, couponRepo)
	couponSvc := service.NewCouponService(couponRepo)
	pointsSvc := service.NewPointsService(userRepo, couponRepo)
	giftSvc := service.NewGiftService(giftRepo, orderRepo)

	// Upload dir
	const uploadDir = "static/uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatalf("failed to create upload dir: %v", err)
	}

	// Handlers
	h := &Handlers{
		Auth:     handler.NewAuthHandler(authSvc),
		Category: handler.NewCategoryHandler(categorySvc),
		Product:  handler.NewProductHandler(productSvc, uploadDir),
		Cart:     handler.NewCartHandler(cartSvc),
		Order:    handler.NewOrderHandler(orderSvc),
		Payment:  handler.NewPaymentHandler(paymentSvc),
		Coupon:   handler.NewCouponHandler(couponSvc),
		Member:   handler.NewMemberHandler(pointsSvc),
		Gift:     handler.NewGiftHandler(giftSvc),
	}

	// Router
	gin.SetMode(cfg.Server.Mode)
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	RegisterRoutes(r, cfg.JWT.Secret, h)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("☕ SanrioCoffee API starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

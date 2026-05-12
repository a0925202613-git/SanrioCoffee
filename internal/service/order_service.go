package service

import (
	"context"
	"errors"
	"fmt"
	"math"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

var (
	ErrCartEmpty           = errors.New("cart is empty")
	ErrInsufficientPoints  = errors.New("insufficient points")
	ErrProductUnavailable  = errors.New("product is not available")
	ErrOrderNotCancellable = errors.New("order cannot be cancelled in current status")
)

type OrderService struct {
	db         *database.DB
	cartRepo   *repository.CartRepository
	orderRepo  *repository.OrderRepository
	userRepo   *repository.UserRepository
	couponRepo *repository.CouponRepository
}

func NewOrderService(
	db *database.DB,
	cartRepo *repository.CartRepository,
	orderRepo *repository.OrderRepository,
	userRepo *repository.UserRepository,
	couponRepo *repository.CouponRepository,
) *OrderService {
	return &OrderService{db: db, cartRepo: cartRepo, orderRepo: orderRepo, userRepo: userRepo, couponRepo: couponRepo}
}

func (s *OrderService) CreateOrder(ctx context.Context, userID int64, req *model.CreateOrderRequest) (*model.OrderWithItems, error) {
	var result *model.OrderWithItems

	err := s.db.WithTx(ctx, func(tx pgx.Tx) error {
		// 1. Get cart items
		cartItems, err := s.cartRepo.GetItemsInTx(ctx, tx, userID)
		if err != nil {
			return err
		}
		if len(cartItems) == 0 {
			return ErrCartEmpty
		}

		// 2. Calculate subtotal
		subtotal := 0.0
		for _, item := range cartItems {
			subtotal += item.Subtotal
		}

		// 3. Apply coupon
		discountAmount := 0.0
		if req.CouponCode != "" {
			coupon, err := s.couponRepo.FindByCodeForUpdate(ctx, tx, req.CouponCode)
			if err != nil {
				return fmt.Errorf("coupon not found: %w", err)
			}
			discount, err := calcDiscount(coupon, subtotal)
			if err != nil {
				return err
			}
			discountAmount = discount
			if err := s.couponRepo.IncrementUsed(ctx, tx, coupon.ID); err != nil {
				return err
			}
			if err := s.couponRepo.RecordUserCoupon(ctx, tx, userID, coupon.ID); err != nil {
				return err
			}
		}

		// 4. Redeem points (1 point = 1 NT$)
		pointsUsed := req.PointsToUse
		if pointsUsed > 0 {
			user, err := s.userRepo.FindByIDForUpdate(ctx, tx, userID)
			if err != nil {
				return err
			}
			if user.Points < pointsUsed {
				return ErrInsufficientPoints
			}
			if err := s.userRepo.UpdatePoints(ctx, tx, userID, -pointsUsed); err != nil {
				return err
			}
			// Record redemption
			if err := s.couponRepo.AddPointTransaction(ctx, tx, &model.PointTransaction{
				UserID:      userID,
				PointsDelta: -pointsUsed,
				Type:        "redeem",
				Description: "點數折抵訂單",
			}); err != nil {
				return err
			}
		}

		totalPrice := math.Max(0, subtotal-discountAmount-float64(pointsUsed))

		// 5. Create order
		order, err := s.orderRepo.Create(ctx, tx, &model.Order{
			UserID:         userID,
			Subtotal:       subtotal,
			DiscountAmount: discountAmount,
			PointsUsed:     pointsUsed,
			TotalPrice:     totalPrice,
			Note:           req.Note,
			PickupTime:     req.PickupTime,
		})
		if err != nil {
			return err
		}

		// 6. Create order items (snapshot)
		orderItems := make([]model.OrderItem, 0, len(cartItems))
		for _, ci := range cartItems {
			extra := 0.0
			for _, c := range ci.Customizations {
				extra += c.PriceDelta
			}
			unitPrice := ci.ProductPrice + extra
			orderItems = append(orderItems, model.OrderItem{
				OrderID:        order.ID,
				ProductID:      ci.ProductID,
				ProductName:    ci.ProductName,
				UnitPrice:      unitPrice,
				Quantity:       ci.Quantity,
				Customizations: ci.Customizations,
				Subtotal:       ci.Subtotal,
			})
		}
		if err := s.orderRepo.CreateItems(ctx, tx, orderItems); err != nil {
			return err
		}

		// 7. Clear cart
		if err := s.cartRepo.ClearCart(ctx, tx, userID); err != nil {
			return err
		}

		result = &model.OrderWithItems{Order: *order, Items: orderItems}
		return nil
	})

	return result, err
}

func (s *OrderService) GetOrder(ctx context.Context, orderID, userID int64, isAdmin bool) (*model.OrderWithItems, error) {
	order, err := s.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if !isAdmin && order.UserID != userID {
		return nil, repository.ErrNotFound
	}
	return order, nil
}

func (s *OrderService) ListOrders(ctx context.Context, userID int64, isAdmin bool, status string) ([]model.Order, error) {
	if isAdmin {
		return s.orderRepo.ListAll(ctx, status)
	}
	return s.orderRepo.ListByUser(ctx, userID)
}

func (s *OrderService) UpdateStatus(ctx context.Context, orderID int64, req *model.UpdateOrderStatusRequest) (*model.Order, error) {
	return s.orderRepo.UpdateStatus(ctx, orderID, req.Status)
}

func (s *OrderService) CancelOrder(ctx context.Context, orderID, userID int64) (*model.Order, error) {
	order, err := s.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, repository.ErrNotFound
	}
	if order.Status != "pending" {
		return nil, ErrOrderNotCancellable
	}
	return s.orderRepo.UpdateStatus(ctx, orderID, "cancelled")
}

func calcDiscount(coupon *model.Coupon, subtotal float64) (float64, error) {
	if !coupon.IsActive {
		return 0, errors.New("coupon is inactive")
	}
	if subtotal < coupon.MinOrderAmount {
		return 0, fmt.Errorf("order total must be at least %.0f", coupon.MinOrderAmount)
	}
	if coupon.UsageLimit != nil && coupon.UsedCount >= *coupon.UsageLimit {
		return 0, errors.New("coupon has reached its usage limit")
	}

	switch coupon.DiscountType {
	case "percentage":
		return math.Round(subtotal*coupon.DiscountValue/100*100) / 100, nil
	case "fixed":
		return math.Min(coupon.DiscountValue, subtotal), nil
	}
	return 0, nil
}

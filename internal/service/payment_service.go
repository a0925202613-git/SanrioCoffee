package service

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
	"sanrio-coffee-api/pkg/database"

	"github.com/jackc/pgx/v5"
)

var (
	ErrOrderAlreadyPaid  = errors.New("order is already paid")
	ErrPaymentInProgress = errors.New("a payment is already in progress for this order")
)

type PaymentService struct {
	db          *database.DB
	paymentRepo *repository.PaymentRepository
	orderRepo   *repository.OrderRepository
	userRepo    *repository.UserRepository
	couponRepo  *repository.CouponRepository
}

func NewPaymentService(
	db *database.DB,
	paymentRepo *repository.PaymentRepository,
	orderRepo *repository.OrderRepository,
	userRepo *repository.UserRepository,
	couponRepo *repository.CouponRepository) *PaymentService {
	return &PaymentService{
		db:          db,
		paymentRepo: paymentRepo,
		orderRepo:   orderRepo,
		userRepo:    userRepo,
		couponRepo:  couponRepo,
	}
}

func (s *PaymentService) Initiate(ctx context.Context, userID int64, req *model.InitiatePaymentRequest) (*model.InitiatePaymentResponse, error) {
	order, err := s.orderRepo.FindByID(ctx, req.OrderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, repository.ErrNotFound
	}
	if order.Status != "pending" {
		return nil, ErrOrderAlreadyPaid
	}

	// 若上次付款仍在 pending（例如使用者重複點擊），拒絕重複發起
	if existing, err := s.paymentRepo.FindByOrderID(ctx, req.OrderID); err == nil && existing.Status == "pending" {
		return nil, ErrPaymentInProgress
	}

	txID := fmt.Sprintf("COFFEE-%d-%d", req.OrderID, time.Now().UnixMilli())

	payment, err := s.paymentRepo.Create(ctx, &model.Payment{
		OrderID:       req.OrderID,
		Amount:        order.TotalPrice,
		Method:        req.Method,
		TransactionID: txID,
	})
	if err != nil {
		return nil, err
	}

	return &model.InitiatePaymentResponse{
		Payment:       *payment,
		TransactionID: txID,
		MockPayURL:    fmt.Sprintf("/api/v1/payments/callback?transaction_id=%s", txID),
	}, nil
}

func (s *PaymentService) Callback(ctx context.Context, req *model.PaymentCallbackRequest) (*model.Payment, error) {
	payment, err := s.paymentRepo.FindByTransactionID(ctx, req.TransactionID)
	if err != nil {
		return nil, err
	}

	order, err := s.orderRepo.FindByID(ctx, payment.OrderID)
	if err != nil {
		return nil, err
	}

	// Determine outcome: forced result or 90% success
	success := req.ForceResult == "success" || (req.ForceResult == "" && rand.Intn(10) < 9) //nolint:gosec

	var finalPayment *model.Payment
	callbackErr := s.db.WithTx(ctx, func(tx pgx.Tx) error {
		status := "failed"
		if success {
			status = "success"
		}

		p, err := s.paymentRepo.UpdateStatus(ctx, tx, payment.ID, status, req.TransactionID)
		if err != nil {
			return err
		}
		finalPayment = p

		// 假設付款成功後才更新訂單狀態，失敗則保持原狀（例如讓使用者重新嘗試付款）
		if success {
			if err := s.orderRepo.UpdateStatusTx(ctx, tx, payment.OrderID, "paid"); err != nil {
				return err
			}
			//確認使用者付款成功 才發送點數
			// Earn points (10 NT$ = 1 point, based on total paid)
			earnedPoints := int(order.TotalPrice / 10)
			if earnedPoints > 0 {
				if err := s.userRepo.UpdatePoints(ctx, tx, order.UserID, earnedPoints); err != nil {
					return err
				}
				oid := order.ID
				if err := s.couponRepo.AddPointTransaction(ctx, tx, &model.PointTransaction{
					UserID:      order.UserID,
					PointsDelta: earnedPoints,
					Type:        "earn",
					OrderID:     &oid,
					Description: fmt.Sprintf("消費獲得點數（訂單 #%d）", order.ID),
				}); err != nil {
					return err
				}
			}
		}
		return nil
	})

	return finalPayment, callbackErr
}

func (s *PaymentService) GetStatus(ctx context.Context, orderID int64) (*model.Payment, error) {
	return s.paymentRepo.FindByOrderID(ctx, orderID)
}

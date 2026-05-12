package service

import (
	"context"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
)

type PointsService struct {
	userRepo   *repository.UserRepository
	couponRepo *repository.CouponRepository
}

func NewPointsService(userRepo *repository.UserRepository, couponRepo *repository.CouponRepository) *PointsService {
	return &PointsService{userRepo: userRepo, couponRepo: couponRepo}
}

func (s *PointsService) GetPoints(ctx context.Context, userID int64) (*model.PointsResponse, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	transactions, err := s.couponRepo.ListPointTransactions(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &model.PointsResponse{
		CurrentPoints: user.Points,
		Transactions:  transactions,
	}, nil
}

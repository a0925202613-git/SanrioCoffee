package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
)

var (
	ErrOrderNotPaid       = errors.New("只有已付款的訂單才能送禮")
	ErrOrderNotOwned      = errors.New("這不是您的訂單")
	ErrGiftNotFound       = errors.New("找不到該禮物兌換碼")
	ErrGiftAlreadyClaimed = errors.New("該禮物已被領取")
	ErrCannotClaimOwnGift = errors.New("不能領取自己送出的禮物")
)

type GiftService struct {
	giftRepo  *repository.GiftRepository
	orderRepo *repository.OrderRepository
}

func NewGiftService(giftRepo *repository.GiftRepository, orderRepo *repository.OrderRepository) *GiftService {
	return &GiftService{
		giftRepo:  giftRepo,
		orderRepo: orderRepo,
	}
}

// CreateGift 建立禮物 (A 客人發起)
func (s *GiftService) CreateGift(ctx context.Context, userID int64, req *model.SendGiftRequest) (*model.Gift, error) {
	// 1. 檢查訂單是否存在且屬於該用戶
	order, err := s.orderRepo.FindByID(ctx, req.OrderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, ErrOrderNotOwned
	}

	// 2. 檢查訂單狀態 (必須是已付款且尚未取貨)
	if order.Status != "paid" {
		return nil, ErrOrderNotPaid
	}

	// 3. 產生唯一的禮物代碼 (Sanrio 風格)
	giftCode := s.generateGiftCode()

	gift := &model.Gift{
		SenderID:  userID,
		OrderID:   req.OrderID,
		GiftCode:  giftCode,
		Status:    "pending",
		Message:   req.Message,
		CreatedAt: time.Now(),
	}

	// 4. 寫入資料庫
	if err := s.giftRepo.Create(ctx, gift); err != nil {
		return nil, err
	}

	return gift, nil
}

// ClaimGift 領取禮物 (B 客人領取)
func (s *GiftService) ClaimGift(ctx context.Context, userID int64, giftCode string) error {
	// 1. 尋找禮物
	gift, err := s.giftRepo.GetByCode(ctx, giftCode)
	if err != nil {
		return ErrGiftNotFound
	}

	// 2. 驗證狀態
	if gift.Status != "pending" {
		return ErrGiftAlreadyClaimed
	}
	if gift.SenderID == userID {
		return ErrCannotClaimOwnGift
	}

	// 3. 執行領取邏輯 (建議這裡要用 Transaction)
	// 更新禮物狀態，並將訂單的持有者改為領取人 B
	now := time.Now()
	gift.ReceiverID = &userID
	gift.Status = "claimed"
	gift.ClaimedAt = &now

	return s.giftRepo.UpdateAndTransferOrder(ctx, gift)
}

// generateGiftCode 產生可愛的隨機碼，例如: SANRIO-HG-X82K9
// 安全的隨機碼產生器
func (s *GiftService) generateGiftCode() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	prefixes := []string{"HG", "PP", "MM", "KU", "XO"}

	// 安全地隨機挑選前綴
	bg, _ := rand.Int(rand.Reader, big.NewInt(int64(len(prefixes))))
	prefix := prefixes[bg.Int64()]

	// 安全地產生 6 位隨機碼
	code := make([]byte, 6)
	for i := range code {
		bg, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		code[i] = charset[bg.Int64()]
	}

	return fmt.Sprintf("SANRIO-%s-%s", prefix, string(code))
}

// GetReceivedGifts 取得該使用者收到的所有禮物
func (s *GiftService) GetReceivedGifts(ctx context.Context, userID int64) ([]*model.Gift, error) {
	return s.giftRepo.GetByReceiver(ctx, userID)
}

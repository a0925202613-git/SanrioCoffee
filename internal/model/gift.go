package model

import "time"

type Gift struct {
	ID         int64      `json:"id"`
	SenderID   int64      `json:"sender_id"`
	OrderID    int64      `json:"order_id"`
	GiftCode   string     `json:"gift_code"`   // 兌換碼，例如: HANGYO-XXXX
	ReceiverID *int64     `json:"receiver_id"` // 初始為 nil
	Status     string     `json:"status"`      // pending, claimed, expired
	Message    string     `json:"message"`     // 悄悄話
	ClaimedAt  *time.Time `json:"claimed_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// SendGiftRequest A 客人發起送禮的請求
type SendGiftRequest struct {
	OrderID int64  `json:"order_id" binding:"required"`
	Message string `json:"message"`
}

// ClaimGiftRequest B 客人領取禮物的請求
type ClaimGiftRequest struct {
	GiftCode string `json:"gift_code" binding:"required"`
}

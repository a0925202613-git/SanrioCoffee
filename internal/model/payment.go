package model

import "time"

type Payment struct {
	ID            int64      `json:"id"`
	OrderID       int64      `json:"order_id"`
	Amount        float64    `json:"amount"`
	Method        string     `json:"method"`
	Status        string     `json:"status"`
	TransactionID string     `json:"transaction_id,omitempty"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
}

type InitiatePaymentRequest struct {
	OrderID int64  `json:"order_id" binding:"required"`
	Method  string `json:"method"   binding:"required,oneof=credit_card line_pay cash_on_pickup"`
}

type InitiatePaymentResponse struct {
	Payment       Payment `json:"payment"`
	TransactionID string  `json:"transaction_id"`
	MockPayURL    string  `json:"mock_pay_url"`
}

type PaymentCallbackRequest struct {
	TransactionID string `json:"transaction_id" binding:"required"`
	ForceResult   string `json:"force_result" binding:"omitempty,oneof=success failed"` // 測試用
}

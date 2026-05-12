package handler

import (
	"strconv"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
)

type PaymentHandler struct {
	svc *service.PaymentService
}

func NewPaymentHandler(svc *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{svc: svc}
}

func (h *PaymentHandler) Initiate(c *gin.Context) {
	userID := c.GetInt64("userID")

	var req model.InitiatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	resp, err := h.svc.Initiate(c.Request.Context(), userID, &req)
	if err != nil {
		switch err {
		case repository.ErrNotFound:
			response.NotFound(c, "order not found")
		case service.ErrOrderAlreadyPaid:
			response.BadRequest(c, "order is already paid or not in pending state")
		default:
			response.InternalError(c, err.Error())
		}
		return
	}
	response.Created(c, resp)
}

func (h *PaymentHandler) Callback(c *gin.Context) {
	var req model.PaymentCallbackRequest

	// 同時支援 query param（模擬 GET webhook）和 JSON body（模擬 POST webhook），
	// 讓前端與 Postman 都能方便測試假金流回調。
	txID := c.Query("transaction_id")
	forceResult := c.Query("force_result")
	if txID != "" {
		req.TransactionID = txID
		req.ForceResult = forceResult
	} else if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	payment, err := h.svc.Callback(c.Request.Context(), &req)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "transaction not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, payment)
}

func (h *PaymentHandler) GetStatus(c *gin.Context) {
	orderID, err := strconv.ParseInt(c.Param("orderId"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	payment, err := h.svc.GetStatus(c.Request.Context(), orderID)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "payment not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, payment)
}

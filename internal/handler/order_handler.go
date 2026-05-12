package handler

import (
	"strconv"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	svc *service.OrderService
}

func NewOrderHandler(svc *service.OrderService) *OrderHandler {
	return &OrderHandler{svc: svc}
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID := c.GetInt64("userID")

	var req model.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	order, err := h.svc.CreateOrder(c.Request.Context(), userID, &req)
	if err != nil {
		switch err {
		case service.ErrCartEmpty:
			response.BadRequest(c, "cart is empty")
		case service.ErrInsufficientPoints:
			response.BadRequest(c, "insufficient points")
		default:
			response.InternalError(c, err.Error())
		}
		return
	}
	response.Created(c, order)
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	userID := c.GetInt64("userID")
	role, _ := c.Get("role")
	// isAdmin 傳給 service，admin 可查任何訂單，consumer 只能查自己的。
	isAdmin := role == "admin"

	orderID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	order, err := h.svc.GetOrder(c.Request.Context(), orderID, userID, isAdmin)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "order not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, order)
}

func (h *OrderHandler) ListOrders(c *gin.Context) {
	userID := c.GetInt64("userID")
	role, _ := c.Get("role")
	isAdmin := role == "admin"
	status := c.Query("status")

	orders, err := h.svc.ListOrders(c.Request.Context(), userID, isAdmin, status)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, orders)
}

func (h *OrderHandler) UpdateStatus(c *gin.Context) {
	orderID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var req model.UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	order, err := h.svc.UpdateStatus(c.Request.Context(), orderID, &req)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "order not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, order)
}

func (h *OrderHandler) CancelOrder(c *gin.Context) {
	userID := c.GetInt64("userID")
	orderID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	order, err := h.svc.CancelOrder(c.Request.Context(), orderID, userID)
	if err != nil {
		switch err {
		case repository.ErrNotFound:
			response.NotFound(c, "order not found")
		case service.ErrOrderNotCancellable:
			response.BadRequest(c, "order cannot be cancelled")
		default:
			response.InternalError(c, err.Error())
		}
		return
	}
	response.Success(c, order)
}

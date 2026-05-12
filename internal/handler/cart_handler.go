package handler

import (
	"strconv"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
)

type CartHandler struct {
	svc *service.CartService
}

func NewCartHandler(svc *service.CartService) *CartHandler {
	return &CartHandler{svc: svc}
}

func (h *CartHandler) GetCart(c *gin.Context) {
	userID := c.GetInt64("userID")
	cart, err := h.svc.GetCart(c.Request.Context(), userID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, cart)
}

func (h *CartHandler) AddItem(c *gin.Context) {
	userID := c.GetInt64("userID")
	var req model.AddCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	item, err := h.svc.AddItem(c.Request.Context(), userID, &req)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "product not found")
			return
		}
		if err == service.ErrProductUnavailable {
			response.BadRequest(c, "product is not available")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Created(c, item)
}

func (h *CartHandler) UpdateItem(c *gin.Context) {
	userID := c.GetInt64("userID")
	itemID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var req model.UpdateCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.svc.UpdateItem(c.Request.Context(), userID, itemID, &req); err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "cart item not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "updated"})
}

func (h *CartHandler) DeleteItem(c *gin.Context) {
	userID := c.GetInt64("userID")
	itemID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	if err := h.svc.DeleteItem(c.Request.Context(), userID, itemID); err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "cart item not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "deleted"})
}

func (h *CartHandler) ClearCart(c *gin.Context) {
	userID := c.GetInt64("userID")
	if err := h.svc.ClearCart(c.Request.Context(), userID); err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "cart cleared"})
}

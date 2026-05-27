package handler

import (
	"strconv"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
)

type CouponHandler struct {
	svc *service.CouponService
}

func NewCouponHandler(svc *service.CouponService) *CouponHandler {
	return &CouponHandler{svc: svc}
}

func (h *CouponHandler) Create(c *gin.Context) {
	var req model.CreateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	coupon, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Created(c, coupon)
}

func (h *CouponHandler) List(c *gin.Context) {
	coupons, err := h.svc.List(c.Request.Context())
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, coupons)
}

func (h *CouponHandler) Validate(c *gin.Context) {
	var req model.ValidateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userIDVal, exists := c.Get("userID")
	if !exists {
		response.BadRequest(c, "user unauthorized")
		return
	}
	userID := userIDVal.(int64)

	result, err := h.svc.Validate(c.Request.Context(), userID, &req)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "coupon not found")
			return
		}
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, result)
}

func (h *CouponHandler) SetActive(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var body struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	coupon, err := h.svc.SetActive(c.Request.Context(), id, body.IsActive)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "coupon not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, coupon)
}

func (h *CouponHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "coupon not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "deleted"})
}

func (h *CouponHandler) GetMyCoupons(c *gin.Context) {
	userIDVal, exists := c.Get("userId")
	if !exists {
		response.BadRequest(c, "user unauthorized")
		return
	}
	userID := userIDVal.(int64)

	coupons, err := h.svc.GetMyCoupons(c.Request.Context(), userID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, coupons)
}

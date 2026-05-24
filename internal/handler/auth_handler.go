package handler

import (
	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req model.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, err := h.svc.Register(c.Request.Context(), &req)
	if err != nil {
		response.Conflict(c, "username or email already exists")
		return
	}
	response.Created(c, user)
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req model.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.svc.ForgotPassword(c.Request.Context(), &req); err != nil {
		response.Success(c, "If the email exists, a reset link has been sent.")
		return
	}

	response.Success(c, "Reset link has been sent to your email.")
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req model.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.svc.ResetPassword(c.Request.Context(), &req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, "Password has been reset successfully.")
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	resp, err := h.svc.Login(c.Request.Context(), &req)
	if err != nil {
		response.Unauthorized(c, "invalid email or password")
		return
	}
	response.Success(c, resp)
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetInt64("userID")
	user, err := h.svc.GetMe(c.Request.Context(), userID)
	if err != nil {
		response.NotFound(c, "user not found")
		return
	}
	response.Success(c, user)
}

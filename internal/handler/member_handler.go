package handler

import (
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
)

type MemberHandler struct {
	pointsSvc *service.PointsService
}

func NewMemberHandler(pointsSvc *service.PointsService) *MemberHandler {
	return &MemberHandler{pointsSvc: pointsSvc}
}

func (h *MemberHandler) GetPoints(c *gin.Context) {
	userID := c.GetInt64("userID")

	points, err := h.pointsSvc.GetPoints(c.Request.Context(), userID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, points)
}

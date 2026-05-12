package handler

import (
	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
)

type GiftHandler struct {
	svc *service.GiftService
}

func NewGiftHandler(svc *service.GiftService) *GiftHandler {
	return &GiftHandler{svc: svc}
}

// SendGift A 客人將已付費的訂單轉為禮物
func (h *GiftHandler) SendGift(c *gin.Context) {
	userID := c.GetInt64("userID")

	var req model.SendGiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	gift, err := h.svc.CreateGift(c.Request.Context(), userID, &req)
	if err != nil {
		// 這裡可以根據 service 回傳的 error type 做判斷
		response.InternalError(c, "無法建立禮物: "+err.Error())
		return
	}

	response.Success(c, gift)
}

// ClaimGift B 客人輸入代碼領取禮物
func (h *GiftHandler) ClaimGift(c *gin.Context) {
	userID := c.GetInt64("userID")

	var req model.ClaimGiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	err := h.svc.ClaimGift(c.Request.Context(), userID, req.GiftCode)
	if err != nil {
		response.BadRequest(c, "領取失敗: "+err.Error())
		return
	}

	response.Success(c, gin.H{"message": "禮物領取成功！Pompompurin 祝你用餐愉快！"})
}

// ListReceivedGifts 查看我收到的禮物清單
func (h *GiftHandler) ListReceivedGifts(c *gin.Context) {
	userID := c.GetInt64("userID")

	gifts, err := h.svc.GetReceivedGifts(c.Request.Context(), userID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, gifts)
}

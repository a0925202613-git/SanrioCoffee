package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"
	"sanrio-coffee-api/internal/service"
	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	svc       *service.ProductService
	uploadDir string
}

func NewProductHandler(svc *service.ProductService, uploadDir string) *ProductHandler {
	return &ProductHandler{svc: svc, uploadDir: uploadDir}
}

func (h *ProductHandler) List(c *gin.Context) {
	categoryIDStr := c.Query("category_id")
	availableStr := c.DefaultQuery("available", "")

	var categoryID int64
	if categoryIDStr != "" {
		id, err := strconv.ParseInt(categoryIDStr, 10, 64)
		if err == nil {
			categoryID = id
		}
	}

	availableOnly := availableStr == "true"

	products, err := h.svc.List(c.Request.Context(), categoryID, availableOnly)
	if err != nil {
		response.InternalError(c, "failed to list products")
		return
	}
	response.Success(c, products)
}

func (h *ProductHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	product, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if strings.Contains(err.Error(), "notfound") {
			response.NotFound(c, "product not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, product)
}

func (h *ProductHandler) Create(c *gin.Context) {
	var req model.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	product, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Created(c, product)
}

func (h *ProductHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var req model.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	product, err := h.svc.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "product not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, product)
}

func (h *ProductHandler) SetAvailability(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var body struct {
		IsAvailable bool `json:"is_available"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	product, err := h.svc.SetAvailability(c.Request.Context(), id, body.IsAvailable)
	if err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "product not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, product)
}

func (h *ProductHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "product not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "deleted"})
}

func (h *ProductHandler) GetCustomizations(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	list, err := h.svc.GetCustomizations(c.Request.Context(), id)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, list)
}

func (h *ProductHandler) AddCustomization(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var req model.CreateCustomizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	custom, err := h.svc.AddCustomization(c.Request.Context(), id, &req)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Created(c, custom)
}

func (h *ProductHandler) DeleteCustomization(c *gin.Context) {
	productID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid product id")
		return
	}
	optionID, err := strconv.ParseInt(c.Param("optionId"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid option id")
		return
	}

	if err := h.svc.DeleteCustomization(c.Request.Context(), productID, optionID); err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "customization not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "deleted"})
}

func (h *ProductHandler) Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		response.BadRequest(c, "image file required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		response.BadRequest(c, "only jpg, png, webp allowed")
		return
	}

	if header.Size > 5*1024*1024 {
		response.BadRequest(c, "file size must be under 5MB")
		return
	}

	// UnixNano 作為檔名避免同名衝突，不需要額外 UUID 套件。
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dst := filepath.Join(h.uploadDir, filename)

	out, err := os.Create(dst)
	if err != nil {
		response.InternalError(c, "failed to save file")
		return
	}
	defer out.Close()
	io.Copy(out, file)

	imageURL := fmt.Sprintf("/uploads/%s", filename)
	c.JSON(http.StatusOK, gin.H{"url": imageURL})

}

// AddRestriction 負責接收管理員丟進來的禁用細項 ID
func (h *ProductHandler) AddRestriction(c *gin.Context) {
	productID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}

	var req struct {
		ItemID     int64 `json:"item_id" binding:"required"`
		IsDisabled bool  `json:"is_disabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	// 💡 呼叫你已經寫好的 Service 方法
	err = h.svc.AddCustomizationRestriction(ctx, productID, req.ItemID, req.IsDisabled)
	if err != nil {
		response.InternalError(c, fmt.Sprintf("設定限制失敗: %v", err))
		return
	}

	response.Success(c, gin.H{
		"product_id":  productID,
		"item_id":     req.ItemID,
		"is_disabled": req.IsDisabled,
		"message":     "黑名單限制設定成功",
	})
}

func (h *ProductHandler) ListGroups(c *gin.Context) {
	groups, err := h.svc.ListAllGroups(c.Request.Context())
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, groups)
}

func (h *ProductHandler) GetBoundGroupIDs(c *gin.Context) {
	productID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid product id")
		return
	}
	ids, err := h.svc.GetBoundGroupIDs(c.Request.Context(), productID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, ids)
}

func (h *ProductHandler) AddItemToGroup(c *gin.Context) {
	groupID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid group id")
		return
	}
	var req model.CreateCustomizationItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	item, err := h.svc.AddItemToGroup(c.Request.Context(), groupID, &req)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Created(c, item)
}

func (h *ProductHandler) DeleteItem(c *gin.Context) {
	itemID, err := strconv.ParseInt(c.Param("itemId"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid item id")
		return
	}
	if err := h.svc.DeleteItem(c.Request.Context(), itemID); err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(c, "item not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "deleted"})
}

func (h *ProductHandler) UnbindGroup(c *gin.Context) {
	productID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid product id")
		return
	}
	groupID, err := strconv.ParseInt(c.Param("groupId"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid group id")
		return
	}
	if err := h.svc.UnbindGroup(c.Request.Context(), productID, groupID); err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "unbound"})
}

// BindGroup 負責接收 {"group_id": 10} 並直接與商品綁定
func (h *ProductHandler) BindGroup(c *gin.Context) {
	productID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid product id")
		return
	}

	var req model.BindCustomizationGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	err = h.svc.BindCustomizationGroup(ctx, productID, req.GroupID)
	if err != nil {
		response.InternalError(c, fmt.Sprintf("綁定群組失敗: %v", err))
		return
	}

	response.Success(c, gin.H{
		"product_id": productID,
		"group_id":   req.GroupID,
		"message":    "群組一次綁定成功",
	})
}

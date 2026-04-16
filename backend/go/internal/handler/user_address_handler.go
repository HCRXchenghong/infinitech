package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

func respondUserAddressError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondUserAddressInvalidRequest(c *gin.Context, message string) {
	respondUserAddressError(c, http.StatusBadRequest, message)
}

func respondUserAddressSuccess(c *gin.Context, message string, data interface{}, legacy gin.H) {
	respondSuccessEnvelope(c, message, data, legacy)
}

func (h *UserHandler) ListAddresses(c *gin.Context) {
	result, err := h.service.ListAddresses(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondUserAddressInvalidRequest(c, err.Error())
		return
	}
	respondPaginatedEnvelope(c, responseCodeOK, "用户地址列表加载成功", "addresses", result, int64(len(result)), 1, len(result))
}

func (h *UserHandler) GetDefaultAddress(c *gin.Context) {
	result, err := h.service.GetDefaultAddress(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondUserAddressInvalidRequest(c, err.Error())
		return
	}
	respondUserAddressSuccess(c, "默认地址加载成功", gin.H{"address": result}, gin.H{"address": result})
}

func (h *UserHandler) CreateAddress(c *gin.Context) {
	input, ok := bindUserAddressInput(c)
	if !ok {
		return
	}
	result, err := h.service.CreateAddress(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		respondUserAddressInvalidRequest(c, err.Error())
		return
	}
	respondUserAddressSuccess(c, "用户地址创建成功", gin.H{"address": result}, gin.H{"address": result})
}

func (h *UserHandler) UpdateAddress(c *gin.Context) {
	input, ok := bindUserAddressInput(c)
	if !ok {
		return
	}
	result, err := h.service.UpdateAddress(c.Request.Context(), c.Param("id"), c.Param("addressId"), input)
	if err != nil {
		respondUserAddressInvalidRequest(c, err.Error())
		return
	}
	respondUserAddressSuccess(c, "用户地址更新成功", gin.H{"address": result}, gin.H{"address": result})
}

func (h *UserHandler) DeleteAddress(c *gin.Context) {
	if err := h.service.DeleteAddress(c.Request.Context(), c.Param("id"), c.Param("addressId")); err != nil {
		respondUserAddressInvalidRequest(c, err.Error())
		return
	}
	respondUserAddressSuccess(c, "用户地址删除成功", gin.H{"addressId": c.Param("addressId"), "deleted": true}, gin.H{"addressId": c.Param("addressId"), "deleted": true})
}

func (h *UserHandler) SetDefaultAddress(c *gin.Context) {
	result, err := h.service.SetDefaultAddress(c.Request.Context(), c.Param("id"), c.Param("addressId"))
	if err != nil {
		respondUserAddressInvalidRequest(c, err.Error())
		return
	}
	respondUserAddressSuccess(c, "默认地址设置成功", gin.H{"address": result}, gin.H{"address": result})
}

func bindUserAddressInput(c *gin.Context) (service.UserAddressInput, bool) {
	var req struct {
		Name      string  `json:"name"`
		Phone     string  `json:"phone"`
		Tag       string  `json:"tag"`
		Address   string  `json:"address"`
		Detail    string  `json:"detail"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		IsDefault bool    `json:"isDefault"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondUserAddressInvalidRequest(c, "invalid request payload")
		return service.UserAddressInput{}, false
	}

	return service.UserAddressInput{
		Name:      req.Name,
		Phone:     req.Phone,
		Tag:       req.Tag,
		Address:   req.Address,
		Detail:    req.Detail,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		IsDefault: req.IsDefault,
	}, true
}

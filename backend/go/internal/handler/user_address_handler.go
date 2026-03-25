package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

func (h *UserHandler) ListAddresses(c *gin.Context) {
	result, err := h.service.ListAddresses(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *UserHandler) GetDefaultAddress(c *gin.Context) {
	result, err := h.service.GetDefaultAddress(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *UserHandler) CreateAddress(c *gin.Context) {
	input, ok := bindUserAddressInput(c)
	if !ok {
		return
	}
	result, err := h.service.CreateAddress(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "address": result})
}

func (h *UserHandler) UpdateAddress(c *gin.Context) {
	input, ok := bindUserAddressInput(c)
	if !ok {
		return
	}
	result, err := h.service.UpdateAddress(c.Request.Context(), c.Param("id"), c.Param("addressId"), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "address": result})
}

func (h *UserHandler) DeleteAddress(c *gin.Context) {
	if err := h.service.DeleteAddress(c.Request.Context(), c.Param("id"), c.Param("addressId")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *UserHandler) SetDefaultAddress(c *gin.Context) {
	result, err := h.service.SetDefaultAddress(c.Request.Context(), c.Param("id"), c.Param("addressId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "address": result})
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
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid request payload"})
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

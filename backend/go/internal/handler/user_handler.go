package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type UserHandler struct {
	service *service.UserService
}

func NewUserHandler(service *service.UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	result, err := h.service.GetUserView(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var req struct {
		Name      string `json:"name"`
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatarUrl"`
		HeaderBg  string `json:"headerBg"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid request payload",
		})
		return
	}

	nickname := req.Nickname
	if nickname == "" {
		nickname = req.Name
	}

	result, err := h.service.UpdateProfile(c.Request.Context(), c.Param("id"), service.UserProfileUpdateInput{
		Nickname:  nickname,
		AvatarURL: req.AvatarURL,
		HeaderBg:  req.HeaderBg,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    result,
	})
}

func (h *UserHandler) ChangePhone(c *gin.Context) {
	var req struct {
		OldPhone string `json:"oldPhone"`
		OldCode  string `json:"oldCode"`
		NewPhone string `json:"newPhone"`
		NewCode  string `json:"newCode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
		})
		return
	}

	result, err := h.service.ChangePhone(
		c.Request.Context(),
		c.Param("id"),
		req.OldPhone,
		req.OldCode,
		req.NewPhone,
		req.NewCode,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, result)
		return
	}

	c.JSON(http.StatusOK, result)
}

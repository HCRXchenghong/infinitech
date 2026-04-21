package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type UserHandler struct {
	service *service.UserService
}

func NewUserHandler(service *service.UserService) *UserHandler {
	return &UserHandler{service: service}
}

func respondUserError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondUserInvalidRequest(c *gin.Context, message string) {
	respondUserError(c, http.StatusBadRequest, message)
}

func respondUserMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func extractMapText(payload map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if value, ok := payload[key]; ok {
			if text := strings.TrimSpace(firstNonEmptyText(toText(value))); text != "" {
				return text
			}
		}
	}
	return ""
}

func writeUserServiceError(c *gin.Context, err error, fallbackStatus int) {
	normalizedError := strings.ToLower(err.Error())

	if errors.Is(err, service.ErrUnauthorized) {
		respondUserError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondUserError(c, http.StatusForbidden, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(normalizedError, "not found") {
		respondUserError(c, http.StatusNotFound, err.Error())
		return
	}
	if strings.Contains(normalizedError, "invalid") ||
		strings.Contains(normalizedError, "required") ||
		strings.Contains(normalizedError, "too long") {
		respondUserInvalidRequest(c, err.Error())
		return
	}
	respondUserError(c, fallbackStatus, err.Error())
}

func writeUserChangePhoneError(c *gin.Context, result map[string]interface{}, err error) {
	message := strings.TrimSpace(extractMapText(result, "error", "message"))
	if message == "" && err != nil {
		message = strings.TrimSpace(err.Error())
	}
	normalizedError := strings.ToLower(strings.TrimSpace(err.Error()))

	switch {
	case message == "用户不存在":
		respondUserError(c, http.StatusNotFound, message)
	case message == "服务暂不可用，请稍后重试",
		message == "验证码服务异常，请稍后重试",
		message == "签发登录凭证失败":
		respondUserError(c, http.StatusInternalServerError, message)
	case errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(normalizedError, "not found"):
		respondUserError(c, http.StatusNotFound, firstNonEmptyText(message, err.Error()))
	default:
		respondUserInvalidRequest(c, firstNonEmptyText(message, err.Error()))
	}
}

func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	result, err := h.service.GetUserView(c.Request.Context(), id)
	if err != nil {
		writeUserServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondUserMirroredSuccess(c, "用户资料加载成功", result)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var req struct {
		Name      string `json:"name"`
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatarUrl"`
		HeaderBg  string `json:"headerBg"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondUserInvalidRequest(c, "invalid request payload")
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
		writeUserServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondSuccessEnvelope(c, "用户资料更新成功", gin.H{"user": result}, gin.H{"user": result})
}

func (h *UserHandler) ChangePhone(c *gin.Context) {
	var req struct {
		OldPhone string `json:"oldPhone"`
		OldCode  string `json:"oldCode"`
		NewPhone string `json:"newPhone"`
		NewCode  string `json:"newCode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondUserInvalidRequest(c, "请求参数错误")
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
		writeUserChangePhoneError(c, result, err)
		return
	}

	respondUserMirroredSuccess(
		c,
		firstNonEmptyText(extractMapText(result, "message"), "手机号修改成功"),
		buildAuthSessionPayload(result),
	)
}

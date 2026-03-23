package v1

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"

	"github.com/usememos/memos/server/auth"
	"github.com/usememos/memos/store"
)

type updateAttachmentBlurRequest struct {
	Blurred bool `json:"blurred"`
}

func (s *APIV1Service) handleUpdateAttachmentBlur(c *echo.Context, authenticator *auth.Authenticator) error {
	ctx := c.Request().Context()
	user, err := authenticator.AuthenticateToUser(ctx, c.Request().Header.Get("Authorization"), c.Request().Header.Get("Cookie"))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "authentication required"})
	}
	if user == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "authentication required"})
	}

	attachmentUID := c.Param("uid")
	attachment, err := s.Store.GetAttachment(ctx, &store.FindAttachment{UID: &attachmentUID})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to get attachment"})
	}
	if attachment == nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "attachment not found"})
	}
	if attachment.CreatorID != user.ID && !isSuperUser(user) {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "permission denied"})
	}
	if !strings.HasPrefix(attachment.Type, "image/") {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "blur is only supported for image attachments"})
	}

	request := &updateAttachmentBlurRequest{}
	if err := json.NewDecoder(c.Request().Body).Decode(request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	currentTs := time.Now().Unix()
	if err := s.Store.UpdateAttachment(ctx, &store.UpdateAttachment{
		ID:        attachment.ID,
		UpdatedTs: &currentTs,
		IsBlurred: &request.Blurred,
	}); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update attachment blur"})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"name":    fmt.Sprintf("%s%s", AttachmentNamePrefix, attachmentUID),
		"blurred": request.Blurred,
	})
}

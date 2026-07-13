package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/oauth"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// providerParams returns map with Provider key for i18n templates
func providerParams(name string) map[string]any {
	return map[string]any{"Provider": name}
}

// GenerateOAuthCode generates a state code for OAuth CSRF protection
func GenerateOAuthCode(c *gin.Context) {
	session := sessions.Default(c)
	state := common.GetRandomString(12)
	affCode := c.Query("aff")
	if affCode != "" {
		session.Set("aff", affCode)
	}
	session.Set("oauth_state", state)
	err := session.Save()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    state,
	})
}

// HandleOAuth handles OAuth callback for all standard OAuth providers
func HandleOAuth(c *gin.Context) {
	providerName := c.Param("provider")
	provider := oauth.GetProvider(providerName)
	if provider == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": i18n.T(c, i18n.MsgOAuthUnknownProvider),
		})
		return
	}

	session := sessions.Default(c)

	// 1. Validate state (CSRF protection)
	state := c.Query("state")
	if state == "" || session.Get("oauth_state") == nil || state != session.Get("oauth_state").(string) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": i18n.T(c, i18n.MsgOAuthStateInvalid),
		})
		return
	}

	// 2. Check if user is already logged in (bind flow)
	username := session.Get("username")
	if username != nil {
		handleOAuthBind(c, provider)
		return
	}

	// 3. Check if provider is enabled
	if !provider.IsEnabled() {
		common.ApiErrorI18n(c, i18n.MsgOAuthNotEnabled, providerParams(provider.GetName()))
		return
	}

	// 4. Handle error from provider
	errorCode := c.Query("error")
	if errorCode != "" {
		errorDescription := c.Query("error_description")
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": errorDescription,
		})
		return
	}

	// 5. Exchange code for token
	code := c.Query("code")
	token, err := provider.ExchangeToken(c.Request.Context(), code, c)
	if err != nil {
		handleOAuthError(c, err)
		return
	}

	// 6. Get user info
	oauthUser, err := provider.GetUserInfo(c.Request.Context(), token)
	if err != nil {
		handleOAuthError(c, err)
		return
	}

	// 如果启用了兑换码验证，检查是否为新用户。
	// 账号被彻底删除后，同一 OAuth 身份应允许按新用户重新注册并重新输入兑换码，
	// 因此这里不再对历史软删除记录做拦截。
	if common.RequireRedemptionForOAuth {
		isNewUser := !provider.IsUserIDTaken(oauthUser.ProviderUserID)

		if isNewUser {
			// 新用户，暂存 OAuth 信息到 session，等待前端输入兑换码
			session.Set("oauth_pending", true)
			session.Set("oauth_provider", providerName)
			session.Set("oauth_user_id", oauthUser.ProviderUserID)
			session.Set("oauth_username", oauthUser.Username)
			session.Set("oauth_display_name", oauthUser.DisplayName)
			session.Set("oauth_email", oauthUser.Email)

			// 如果有 extra 数据也保存（如 GitHub legacy_id）
			if len(oauthUser.Extra) > 0 {
				extraJson, _ := common.Marshal(oauthUser.Extra)
				session.Set("oauth_extra", string(extraJson))
			}

			err = session.Save()
			if err != nil {
				common.ApiError(c, err)
				return
			}

			// 返回特殊状态，告诉前端需要输入兑换码
			c.JSON(http.StatusOK, gin.H{
				"success":            true,
				"message":            "",
				"pending_redemption": true,
			})
			return
		}
	}

	// 7. Find or create user
	user, err := findOrCreateOAuthUser(c, provider, oauthUser, session)
	if err != nil {
		if errors.Is(err, model.ErrEmailAlreadyTaken) {
			common.ApiErrorI18n(c, i18n.MsgUserEmailAlreadyTaken)
			return
		}
		switch err.(type) {
		case *OAuthUserDeletedError:
			common.ApiErrorI18n(c, i18n.MsgOAuthUserDeleted)
		case *OAuthRegistrationDisabledError:
			common.ApiErrorI18n(c, i18n.MsgUserRegisterDisabled)
		case *OAuthEmailAlreadyTakenError:
			common.ApiErrorI18n(c, i18n.MsgUserEmailAlreadyTaken)
		default:
			common.ApiError(c, err)
		}
		return
	}

	// 8. Check user status
	if user.Status != common.UserStatusEnabled {
		common.ApiErrorI18n(c, i18n.MsgOAuthUserBanned)
		return
	}

	// 9. Setup login
	setupLogin(user, c)
}

// handleOAuthBind handles binding OAuth account to existing user
func handleOAuthBind(c *gin.Context, provider oauth.Provider) {
	if !provider.IsEnabled() {
		common.ApiErrorI18n(c, i18n.MsgOAuthNotEnabled, providerParams(provider.GetName()))
		return
	}

	// Exchange code for token
	code := c.Query("code")
	token, err := provider.ExchangeToken(c.Request.Context(), code, c)
	if err != nil {
		handleOAuthError(c, err)
		return
	}

	// Get user info
	oauthUser, err := provider.GetUserInfo(c.Request.Context(), token)
	if err != nil {
		handleOAuthError(c, err)
		return
	}

	// Check if this OAuth account is already bound (check both new ID and legacy ID)
	if provider.IsUserIDTaken(oauthUser.ProviderUserID) {
		common.ApiErrorI18n(c, i18n.MsgOAuthAlreadyBound, providerParams(provider.GetName()))
		return
	}
	// Also check legacy ID to prevent duplicate bindings during migration period
	if legacyID, ok := oauthUser.Extra["legacy_id"].(string); ok && legacyID != "" {
		if provider.IsUserIDTaken(legacyID) {
			common.ApiErrorI18n(c, i18n.MsgOAuthAlreadyBound, providerParams(provider.GetName()))
			return
		}
	}

	// Get current user from session
	session := sessions.Default(c)
	id := session.Get("id")
	user := model.User{Id: id.(int)}
	err = user.FillUserById()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// Handle binding based on provider type
	if genericProvider, ok := provider.(*oauth.GenericOAuthProvider); ok {
		// Custom provider: use user_oauth_bindings table
		err = model.UpdateUserOAuthBinding(user.Id, genericProvider.GetProviderId(), oauthUser.ProviderUserID)
		if err != nil {
			common.ApiError(c, err)
			return
		}
	} else {
		// Built-in provider: update user record directly
		provider.SetProviderUserID(&user, oauthUser.ProviderUserID)
		err = user.Update(false)
		if err != nil {
			common.ApiError(c, err)
			return
		}
	}

	common.ApiSuccessI18n(c, i18n.MsgOAuthBindSuccess, gin.H{
		"action": "bind",
	})
}

// findOrCreateOAuthUser finds existing user or creates new user
func findOrCreateOAuthUser(c *gin.Context, provider oauth.Provider, oauthUser *oauth.OAuthUser, session sessions.Session) (*model.User, error) {
	user := &model.User{}

	// Check if user already exists with new ID
	if provider.IsUserIDTaken(oauthUser.ProviderUserID) {
		err := provider.FillUserByProviderID(user, oauthUser.ProviderUserID)
		if err != nil {
			return nil, err
		}
		// Check if user has been deleted
		if user.Id == 0 {
			return nil, &OAuthUserDeletedError{}
		}
		return user, nil
	}

	// Try to find user with legacy ID (for GitHub migration from login to numeric ID)
	if legacyID, ok := oauthUser.Extra["legacy_id"].(string); ok && legacyID != "" {
		if provider.IsUserIDTaken(legacyID) {
			err := provider.FillUserByProviderID(user, legacyID)
			if err != nil {
				return nil, err
			}
			if user.Id != 0 {
				// Found user with legacy ID, migrate to new ID
				common.SysLog(fmt.Sprintf("[OAuth] Migrating user %d from legacy_id=%s to new_id=%s",
					user.Id, legacyID, oauthUser.ProviderUserID))
				if err := user.UpdateGitHubId(oauthUser.ProviderUserID); err != nil {
					common.SysError(fmt.Sprintf("[OAuth] Failed to migrate user %d: %s", user.Id, err.Error()))
					// Continue with login even if migration fails
				}
				return user, nil
			}
		}
	}

	// User doesn't exist, create new user if registration is enabled
	if !common.RegisterEnabled {
		return nil, &OAuthRegistrationDisabledError{}
	}

	// Set up new user
	user.Username = provider.GetProviderPrefix() + strconv.Itoa(model.GetMaxUserId()+1)

	if oauthUser.Username != "" {
		if exists, err := model.CheckUserExistOrDeleted(oauthUser.Username, ""); err == nil && !exists {
			// 防止索引退化
			if len(oauthUser.Username) <= model.UserNameMaxLength {
				user.Username = oauthUser.Username
			}
		}
	}

	if oauthUser.DisplayName != "" {
		user.DisplayName = oauthUser.DisplayName
	} else if oauthUser.Username != "" {
		user.DisplayName = oauthUser.Username
	} else {
		user.DisplayName = provider.GetName() + " User"
	}
	if oauthUser.Email != "" {
		user.Email = model.NormalizeEmail(oauthUser.Email)
		if err := model.EnsureEmailAvailable(user.Email, 0); err != nil {
			if errors.Is(err, model.ErrEmailAlreadyTaken) {
				return nil, &OAuthEmailAlreadyTakenError{}
			}
			return nil, err
		}
	}
	user.Role = common.RoleCommonUser
	user.Status = common.UserStatusEnabled

	// Handle affiliate code
	affCode := session.Get("aff")
	inviterId := 0
	if affCode != nil {
		inviterId, _ = model.GetUserIdByAffCode(affCode.(string))
	}

	// Use transaction to ensure user creation and OAuth binding are atomic
	if genericProvider, ok := provider.(*oauth.GenericOAuthProvider); ok {
		// Custom provider: create user and binding in a transaction
		err := model.DB.Transaction(func(tx *gorm.DB) error {
			// Create user
			if err := user.InsertWithTx(tx, inviterId); err != nil {
				return err
			}

			// Create OAuth binding
			binding := &model.UserOAuthBinding{
				UserId:         user.Id,
				ProviderId:     genericProvider.GetProviderId(),
				ProviderUserId: oauthUser.ProviderUserID,
			}
			if err := model.CreateUserOAuthBindingWithTx(tx, binding); err != nil {
				return err
			}

			return nil
		})
		if err != nil {
			return nil, err
		}

		// Perform post-transaction tasks (logs, sidebar config, inviter rewards)
		user.FinalizeOAuthUserCreation(inviterId)
	} else {
		// Built-in provider: create user and update provider ID in a transaction
		err := model.DB.Transaction(func(tx *gorm.DB) error {
			// Create user
			if err := user.InsertWithTx(tx, inviterId); err != nil {
				return err
			}

			// Set the provider user ID on the user model and update
			provider.SetProviderUserID(user, oauthUser.ProviderUserID)
			if err := tx.Model(user).Updates(map[string]interface{}{
				"github_id":   user.GitHubId,
				"discord_id":  user.DiscordId,
				"oidc_id":     user.OidcId,
				"linux_do_id": user.LinuxDOId,
				"wechat_id":   user.WeChatId,
				"telegram_id": user.TelegramId,
			}).Error; err != nil {
				return err
			}

			return nil
		})
		if err != nil {
			return nil, err
		}

		// Perform post-transaction tasks
		user.FinalizeOAuthUserCreation(inviterId)
	}

	return user, nil
}

// Error types for OAuth
type OAuthUserDeletedError struct{}

func (e *OAuthUserDeletedError) Error() string {
	return "user has been deleted"
}

type OAuthRegistrationDisabledError struct{}

func (e *OAuthRegistrationDisabledError) Error() string {
	return "registration is disabled"
}

type OAuthEmailAlreadyTakenError struct{}

func (e *OAuthEmailAlreadyTakenError) Error() string {
	return "email is already in use"
}

// oauthProviderColumn maps a provider name to the users table column storing the OAuth user ID.
func oauthProviderColumn(providerName string) string {
	switch providerName {
	case "linuxdo":
		return "linux_do_id"
	case "github":
		return "github_id"
	case "discord":
		return "discord_id"
	case "wechat":
		return "wechat_id"
	case "telegram":
		return "telegram_id"
	case "oidc":
		return "oidc_id"
	default:
		return ""
	}
}

// handleOAuthError handles OAuth errors and returns translated message
func handleOAuthError(c *gin.Context, err error) {
	switch e := err.(type) {
	case *oauth.OAuthError:
		if e.Params != nil {
			common.ApiErrorI18n(c, e.MsgKey, e.Params)
		} else {
			common.ApiErrorI18n(c, e.MsgKey)
		}
	case *oauth.AccessDeniedError:
		common.ApiErrorMsg(c, e.Message)
	case *oauth.TrustLevelError:
		common.ApiErrorI18n(c, i18n.MsgOAuthTrustLevelLow)
	default:
		common.ApiError(c, err)
	}
}

// CompleteOAuthRegistration 验证兑换码并完成注册（支持 OAuth 注册和密码注册）
func CompleteOAuthRegistration(c *gin.Context) {
	session := sessions.Default(c)

	// 检查是 OAuth 注册还是密码注册
	oauthPending := session.Get("oauth_pending")
	regPending := session.Get("reg_pending")

	isOAuthPending := oauthPending != nil && oauthPending.(bool)
	isRegPending := regPending != nil && regPending.(bool)

	if !isOAuthPending && !isRegPending {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "没有待完成的注册",
		})
		return
	}

	// 获取兑换码
	var req struct {
		RedemptionCode string `json:"redemption_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	// 验证兑换码
	err := model.ValidateRedemptionForOAuth(req.RedemptionCode)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// ====================================================================
	// 密码注册流程
	// ====================================================================
	if isRegPending {
		username := session.Get("reg_username").(string)
		password := session.Get("reg_password").(string)
		displayName := ""
		if v := session.Get("reg_display_name"); v != nil {
			displayName = v.(string)
		}
		if displayName == "" {
			displayName = username
		}
		email := ""
		if v := session.Get("reg_email"); v != nil {
			email = v.(string)
		}

		affCode := ""
		if v := session.Get("reg_aff_code"); v != nil {
			affCode = v.(string)
		}
		inviterId := 0
		if affCode != "" {
			inviterId, _ = model.GetUserIdByAffCode(affCode)
		}

		// 再次检查用户不存在（防止并发注册）
		if exist, _ := model.CheckUserExistOrDeleted(username, email); exist {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户名已被注册",
			})
			return
		}

		cleanUser := model.User{
			Username:    username,
			Password:    password,
			DisplayName: displayName,
			InviterId:   inviterId,
			Role:        common.RoleCommonUser,
		}
		if email != "" {
			cleanUser.Email = email
		}

		if err := cleanUser.Insert(inviterId); err != nil {
			common.ApiError(c, err)
			return
		}

		// 消费兑换码并赠送额度
		quota, redeemErr := model.Redeem(req.RedemptionCode, cleanUser.Id)
		if redeemErr != nil {
			common.SysError(fmt.Sprintf("Failed to redeem code for password-registered user %d: %s", cleanUser.Id, redeemErr.Error()))
			quota = 0
		}

		// 清除 session
		session.Delete("reg_pending")
		session.Delete("reg_username")
		session.Delete("reg_password")
		session.Delete("reg_display_name")
		session.Delete("reg_email")
		session.Delete("reg_aff_code")

		// 设置登录状态（仅建立会话，不写响应；下面统一返回注册结果）
		if err := establishLoginSession(&cleanUser, c); err != nil {
			common.ApiErrorI18n(c, i18n.MsgUserSessionSaveFailed)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "注册成功",
			"data":    quota,
		})
		return
	}

	// ====================================================================
	// OAuth 注册流程（原有逻辑）
	// ====================================================================

	// 4. 从 session 恢复 OAuth 用户信息
	providerName := session.Get("oauth_provider").(string)
	provider := oauth.GetProvider(providerName)
	if provider == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的 OAuth 提供商",
		})
		return
	}

	oauthUser := &oauth.OAuthUser{
		ProviderUserID: session.Get("oauth_user_id").(string),
	}

	if username := session.Get("oauth_username"); username != nil {
		oauthUser.Username = username.(string)
	}
	if displayName := session.Get("oauth_display_name"); displayName != nil {
		oauthUser.DisplayName = displayName.(string)
	}
	if email := session.Get("oauth_email"); email != nil {
		oauthUser.Email = email.(string)
	}
	if extraJson := session.Get("oauth_extra"); extraJson != nil {
		var extra map[string]interface{}
		common.Unmarshal([]byte(extraJson.(string)), &extra)
		oauthUser.Extra = extra
	}


	// 5. 创建用户
	user := &model.User{}
	user.Username = provider.GetProviderPrefix() + strconv.Itoa(model.GetMaxUserId()+1)

	if oauthUser.Username != "" {
		if exists, err := model.CheckUserExistOrDeleted(oauthUser.Username, ""); err == nil && !exists {
			if len(oauthUser.Username) <= model.UserNameMaxLength {
				user.Username = oauthUser.Username
			}
		}
	}

	if oauthUser.DisplayName != "" {
		user.DisplayName = oauthUser.DisplayName
	} else if oauthUser.Username != "" {
		user.DisplayName = oauthUser.Username
	} else {
		user.DisplayName = provider.GetName() + " User"
	}

	if oauthUser.Email != "" {
		user.Email = oauthUser.Email
	}

	user.Role = common.RoleCommonUser
	user.Status = common.UserStatusEnabled

	// 6. 处理推广码（如果有）
	affCode := session.Get("aff")
	inviterId := 0
	if affCode != nil {
		inviterId, _ = model.GetUserIdByAffCode(affCode.(string))
	}


	// 7. 创建用户并绑定 OAuth
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		// 根据提供商类型设置对应字段
		switch providerName {
		case "linuxdo":
			user.LinuxDOId = oauthUser.ProviderUserID
		case "github":
			user.GitHubId = oauthUser.ProviderUserID
		case "discord":
			user.DiscordId = oauthUser.ProviderUserID
		case "wechat":
			user.WeChatId = oauthUser.ProviderUserID
		case "telegram":
			user.TelegramId = oauthUser.ProviderUserID
		case "oidc":
			user.OidcId = oauthUser.ProviderUserID
		}

		if err := user.InsertWithTx(tx, inviterId); err != nil {
			return err
		}

		// 如果是自定义 OAuth，还需创建绑定记录
		if genericProvider, ok := provider.(*oauth.GenericOAuthProvider); ok {
			binding := &model.UserOAuthBinding{
				UserId:         user.Id,
				ProviderId:     genericProvider.GetProviderId(),
				ProviderUserId: oauthUser.ProviderUserID,
			}
			if err := model.CreateUserOAuthBindingWithTx(tx, binding); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		common.ApiError(c, err)
		return
	}


	// 8. 用户创建成功后的后续操作
	user.FinalizeOAuthUserCreation(inviterId)

	// 9. 消费兑换码并赠送额度（如果有）
	quota, err := model.Redeem(req.RedemptionCode, user.Id)
	if err != nil {
		common.SysError(fmt.Sprintf("Failed to redeem code %s for user %d: %s", req.RedemptionCode, user.Id, err.Error()))
		// 不阻断注册流程，只记录错误
		quota = 0
	} else {
		if quota > 0 {
			common.SysLog(fmt.Sprintf("User %d redeemed code %s, got quota %d", user.Id, req.RedemptionCode, quota))
		} else {
			common.SysLog(fmt.Sprintf("User %d redeemed code %s (zero-quota registration)", user.Id, req.RedemptionCode))
		}
	}

	// 10. 清除 session 中的待注册状态
	session.Delete("oauth_pending")
	session.Delete("oauth_provider")
	session.Delete("oauth_user_id")
	session.Delete("oauth_username")
	session.Delete("oauth_display_name")
	session.Delete("oauth_email")
	session.Delete("oauth_extra")

	// 11. 设置登录状态（仅建立会话，不写响应；下面统一返回注册结果）
	if err := establishLoginSession(user, c); err != nil {
		common.ApiErrorI18n(c, i18n.MsgUserSessionSaveFailed)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "注册成功",
		"data":    quota, // 返回获得的额度（可能为 0）
	})
}

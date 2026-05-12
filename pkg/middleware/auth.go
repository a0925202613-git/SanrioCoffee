package middleware

import (
	"strings"

	"sanrio-coffee-api/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"` // "admin" | "consumer"
	jwt.RegisteredClaims
}

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			response.Unauthorized(c, "missing or invalid authorization header")
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			response.Unauthorized(c, "invalid or expired token")
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func AdminOnly(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "admin" {
		response.Forbidden(c, "admin access required")
		c.Abort()
		return
	}
	c.Next()
}

func ConsumerOnly(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "consumer" {
		response.Forbidden(c, "consumer access required")
		c.Abort()
		return
	}
	c.Next()
}

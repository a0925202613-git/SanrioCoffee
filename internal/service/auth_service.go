package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"sanrio-coffee-api/internal/model"
	"sanrio-coffee-api/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo    *repository.UserRepository
	rdb         *redis.Client
	jwtSecret   string
	expireHours int
}

func NewAuthService(userRepo *repository.UserRepository, rdb *redis.Client, secret string, expireHours int) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		rdb:         rdb,
		jwtSecret:   secret,
		expireHours: expireHours}
}

var ErrInvalidCredentials = errors.New("invalid email or password")

func (s *AuthService) Register(ctx context.Context, req *model.RegisterRequest) (*model.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	role := req.Role
	if role == "" {
		role = "consumer"
	}

	u := &model.User{
		Username: req.Username,
		Email:    req.Email,
		Phone:    req.Phone,
		Role:     role,
	}
	return s.userRepo.Create(ctx, u, string(hash))
}

func (s *AuthService) ForgotPassword(ctx context.Context, req *model.ForgotPasswordRequest) error {
	user, _, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return errors.New("user not found")
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	token := hex.EncodeToString(b)

	redisKey := fmt.Sprintf("pwd_reset:%s", token)
	err = s.rdb.Set(ctx, redisKey, user.ID, 15*time.Minute).Err()
	if err != nil {
		return err
	}

	fmt.Printf("【發送重設密碼郵件】用戶 %s 您好，請點擊連結重設密碼，Token 為: %s\n", user.Username, token)

	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, req *model.ResetPasswordRequest) error {
	redisKey := fmt.Sprintf("pwd_reset:%s", req.Token)

	userIDStr, err := s.rdb.Get(ctx, redisKey).Result()
	if err == redis.Nil {
		return errors.New("token has expired or is invalid")
	} else if err != nil {
		return err
	}

	var userID int64
	if _, err := fmt.Sscanf(userIDStr, "%d", &userID); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	err = s.userRepo.UpdatePassword(ctx, userID, string(hash))
	if err != nil {
		return err
	}

	s.rdb.Del(ctx, redisKey)

	return nil
}

func (s *AuthService) Login(ctx context.Context, req *model.LoginRequest) (*model.LoginResponse, error) {
	user, hash, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := s.generateToken(user.ID, user.Role)
	if err != nil {
		return nil, err
	}

	return &model.LoginResponse{Token: token, User: *user}, nil
}

func (s *AuthService) GetMe(ctx context.Context, userID int64) (*model.User, error) {
	return s.userRepo.FindByID(ctx, userID)
}

type jwtClaims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func (s *AuthService) generateToken(userID int64, role string) (string, error) {
	claims := jwtClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.expireHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}

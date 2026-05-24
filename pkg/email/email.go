// 檔案位置：pkg/email/email.go
package email

import (
	"fmt"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type Mailer interface {
	SendResetPasswordEmail(toEmail, username, token string) error
}

type SendGridMailer struct {
	apiKey string
	from   string
}

func NewSendGridMailer(apiKey, fromEmail string) *SendGridMailer {
	return &SendGridMailer{apiKey: apiKey, from: fromEmail}
}

func (m *SendGridMailer) SendResetPasswordEmail(toEmail, username, token string) error {
	fmt.Printf("\n🚀 [DEBUG 測試模式] SendGrid 正在發信...\n👤 收件人: %s (%s)\n🔑 臨時 Token: %s\n\n", username, toEmail, token)

	from := mail.NewEmail("SanrioCoffee", m.from)
	subject := "【SanrioCoffee】重設您的帳號密碼"
	to := mail.NewEmail(username, toEmail)

	resetLink := fmt.Sprintf("https://sanriocoffee.com/reset-password?token=%s", token)

	htmlContent := fmt.Sprintf(`
        <h3>哈囉 %s！</h3>
        <p>我們收到了您重設密碼的請求。請點擊下方連結以重設密碼（連結將於 15 分鐘後過期）：</p>
        <p><a href="%s" style="padding: 10px 20px; background-color: #ffb6c1; color: white; text-decoration: none; border-radius: 5px;">點我重設密碼</a></p>
        <p>若您沒有發出此請求，請忽略本信件。</p>
    `, username, resetLink)

	message := mail.NewSingleEmail(from, subject, to, "", htmlContent)
	client := sendgrid.NewSendClient(m.apiKey)

	_, err := client.Send(message)
	return err
}

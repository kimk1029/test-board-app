import nodemailer from 'nodemailer'

// 이메일 전송 설정 (환경 변수가 있을 때만)
let transporter: nodemailer.Transporter | null = null

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// 인증 코드 이메일 발송
export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<void> {
  // SMTP 설정이 없으면 개발 모드로 간주하고 이메일 발송 건너뛰기
  if (!transporter || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // console.log(`[개발 모드] 이메일 인증 코드: ${code} (${email})`)
    return // 개발 모드에서는 에러를 던지지 않고 그냥 반환
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: '[게시판 애플리케이션] 이메일 인증 코드',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">이메일 인증</h2>
        <p>안녕하세요,</p>
        <p>회원가입을 위한 이메일 인증 코드입니다.</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
        </div>
        <p>이 코드는 10분간 유효합니다.</p>
        <p>만약 본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">이 이메일은 자동으로 발송되었습니다.</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
  } catch (error) {
    console.error('이메일 발송 오류:', error)
    throw new Error('이메일 발송에 실패했습니다.')
  }
}

// 비밀번호 재설정 이메일 발송
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  // SMTP 설정이 없으면 개발 모드로 간주하고 이메일 발송 건너뛰기
  if (!transporter || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // console.log(`[개발 모드] 비밀번호 재설정 토큰: ${resetToken} (${email})`)
    return // 개발 모드에서는 에러를 던지지 않고 그냥 반환
  }

  // 재설정 링크 생성 (프론트엔드 URL)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.NODE_ENV === 'production' ? 'https://dopamine.land' : 'http://localhost:3000')
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: '[Dopamine] 비밀번호 재설정',
    html: `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0c;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0c; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1f; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Dopamine
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">
                      비밀번호 재설정
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      안녕하세요,
                    </p>
                    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                      비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요.
                    </p>
                    
                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${resetUrl}" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);">
                            비밀번호 재설정하기
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <div style="background-color: #0f0f12; border-radius: 8px; padding: 20px; margin: 30px 0; border: 1px solid rgba(255, 255, 255, 0.1);">
                      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px 0; font-weight: 500;">
                        버튼이 작동하지 않는다면 아래 링크를 복사하여 브라우저에 붙여넣으세요:
                      </p>
                      <p style="color: #8b5cf6; font-size: 12px; word-break: break-all; margin: 0; font-family: 'Courier New', monospace; background-color: #0a0a0c; padding: 12px; border-radius: 4px;">
                        ${resetUrl}
                      </p>
                    </div>
                    
                    <!-- Warning -->
                    <div style="background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 15px; margin: 30px 0; border-radius: 4px;">
                      <p style="color: #fca5a5; font-size: 13px; margin: 0; line-height: 1.5;">
                        <strong style="color: #ef4444;">⚠️ 중요:</strong><br>
                        • 이 링크는 <strong>1시간</strong>간만 유효합니다.<br>
                        • 링크는 <strong>한 번만</strong> 사용할 수 있습니다.<br>
                        • 본인이 요청하지 않았다면 이 이메일을 무시하세요.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f0f12; padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <p style="color: #64748b; font-size: 12px; margin: 0 0 10px 0;">
                      <a href="${baseUrl}" style="color: #8b5cf6; text-decoration: none;">dopamine.land</a>에서 발송된 이메일입니다.
                    </p>
                    <p style="color: #475569; font-size: 11px; margin: 0;">
                      이 이메일은 자동으로 발송되었습니다. 문의사항이 있으시면 고객지원으로 연락해주세요.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
  } catch (error) {
    console.error('이메일 발송 오류:', error)
    throw new Error('이메일 발송에 실패했습니다.')
  }
}


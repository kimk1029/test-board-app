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
    console.log(`[개발 모드] 이메일 인증 코드: ${code} (${email})`)
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


# 이메일 인증 설정 가이드

## Gmail 사용하기 (가장 간단한 방법)

### 1. Gmail 2단계 인증 활성화

1. [Google 계정 관리](https://myaccount.google.com/)에 접속
2. **보안** 탭 클릭
3. **Google에 로그인** 섹션에서 **2단계 인증** 활성화

### 2. 앱 비밀번호 생성

1. **보안** 탭에서 **앱 비밀번호** 찾기
   - 또는 직접 접속: https://myaccount.google.com/apppasswords
2. **앱 선택**: "메일" 선택
3. **기기 선택**: "기타(맞춤 이름)" 선택 → "게시판 앱" 등 입력
4. **생성** 버튼 클릭
5. **16자리 비밀번호 복사** (공백 제거 필요)

### 3. .env 파일에 추가

프로젝트 루트의 `.env` 파일에 다음 내용을 추가하세요:

```env
# Gmail SMTP 설정
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-digit-app-password"
SMTP_FROM="your-email@gmail.com"
```

**예시**:
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="example@gmail.com"
SMTP_PASS="abcd efgh ijkl mnop"
SMTP_FROM="example@gmail.com"
```

> **참고**: `SMTP_PASS`에 입력하는 것은 **일반 Gmail 비밀번호가 아닌 앱 비밀번호**입니다.

---

## 다른 이메일 서비스 사용하기

### Outlook/Hotmail

```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-password"
SMTP_FROM="your-email@outlook.com"
```

### 네이버 메일

```env
SMTP_HOST="smtp.naver.com"
SMTP_PORT="587"
SMTP_USER="your-id@naver.com"
SMTP_PASS="your-password"
SMTP_FROM="your-id@naver.com"
```

**중요**: 네이버는 [메일 환경설정](https://mail.naver.com/)에서 **POP3/IMAP 설정을 활성화**해야 합니다.

### 카카오 메일

```env
SMTP_HOST="smtp.daum.net"
SMTP_PORT="465"
SMTP_USER="your-id@hanmail.net"
SMTP_PASS="your-password"
SMTP_FROM="your-id@hanmail.net"
```

---

## 개발 모드 (SMTP 설정 없이 사용)

SMTP 설정이 없어도 개발 모드로 작동합니다:
- 인증 코드가 서버 콘솔에 출력됩니다
- API 응답에 인증 코드가 포함됩니다
- 실제 이메일은 발송되지 않습니다

---

## 문제 해결

### Gmail에서 "보안 수준이 낮은 앱의 액세스" 오류
- 더 이상 지원되지 않는 기능입니다
- 반드시 **앱 비밀번호**를 사용해야 합니다

### "EAUTH" 오류
- 이메일 주소와 앱 비밀번호가 올바른지 확인
- Gmail의 경우 일반 비밀번호가 아닌 **앱 비밀번호**를 사용해야 합니다

### 이메일이 발송되지 않음
- 환경 변수가 올바르게 설정되었는지 확인
- 서버를 재시작했는지 확인
- 콘솔 로그에서 오류 메시지 확인


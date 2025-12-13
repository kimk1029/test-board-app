#!/bin/bash

# 데이터베이스 설정 스크립트

echo "=== 데이터베이스 설정 시작 ==="

# PostgreSQL 서비스 시작
echo "1. PostgreSQL 서비스 시작 중..."
sudo service postgresql start 2>/dev/null || sudo systemctl start postgresql 2>/dev/null

# 서비스 시작 대기
sleep 3

# PostgreSQL 연결 확인
if ! pg_isready > /dev/null 2>&1; then
    echo "❌ PostgreSQL 서비스가 실행되지 않았습니다."
    echo "다음 명령어로 수동으로 시작해주세요:"
    echo "  sudo service postgresql start"
    echo "  또는"
    echo "  sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL 서비스 실행 중"

# 데이터베이스 이름
DB_NAME="test_board_db"
DB_USER="test_board_user"
DB_PASSWORD="test_board_password"

# .env 파일에서 DATABASE_URL 읽기
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    # 기존 DATABASE_URL이 있으면 사용
    EXISTING_DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    if [ ! -z "$EXISTING_DB_URL" ] && [[ "$EXISTING_DB_URL" != *"user:password"* ]]; then
        echo "기존 DATABASE_URL을 사용합니다."
        exit 0
    fi
fi

echo "2. 데이터베이스 생성 중..."

# 데이터베이스 생성
sudo -u postgres psql <<EOF
-- 데이터베이스가 이미 존재하는지 확인
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- 사용자 생성 (이미 존재하면 무시)
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo "✅ 데이터베이스 생성 완료"
    
    # .env 파일 업데이트
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"
    
    if [ -f "$ENV_FILE" ]; then
        # 기존 DATABASE_URL 업데이트
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" "$ENV_FILE"
    else
        # 새 .env 파일 생성
        cat > "$ENV_FILE" <<ENVEOF
# Database
DATABASE_URL="$DATABASE_URL"

# JWT Secret
JWT_SECRET="$(openssl rand -base64 32)"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
ENVEOF
    fi
    
    echo "✅ .env 파일 업데이트 완료"
    echo ""
    echo "데이터베이스 정보:"
    echo "  데이터베이스명: $DB_NAME"
    echo "  사용자명: $DB_USER"
    echo "  비밀번호: $DB_PASSWORD"
    echo ""
    echo "3. Prisma 스키마 적용 중..."
    
    # Prisma Client 생성
    npm run db:generate
    
    # 데이터베이스 스키마 적용
    npm run db:push
    
    if [ $? -eq 0 ]; then
        echo "✅ 데이터베이스 설정 완료!"
        echo ""
        echo "이제 다음 명령어로 개발 서버를 시작할 수 있습니다:"
        echo "  npm run dev"
    else
        echo "❌ Prisma 스키마 적용 실패"
        exit 1
    fi
else
    echo "❌ 데이터베이스 생성 실패"
    exit 1
fi


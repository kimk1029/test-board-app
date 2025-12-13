#!/bin/bash

# 수동 데이터베이스 설정 스크립트 (sudo 권한 필요)

echo "=== 데이터베이스 설정 시작 ==="
echo ""
echo "이 스크립트는 다음 작업을 수행합니다:"
echo "1. PostgreSQL 서비스 시작"
echo "2. 데이터베이스 생성 (test_board_db)"
echo "3. 사용자 생성 및 권한 부여"
echo "4. .env 파일 업데이트"
echo "5. Prisma 스키마 적용"
echo ""

# PostgreSQL 서비스 시작
echo "1. PostgreSQL 서비스 시작 중..."
sudo service postgresql start || sudo systemctl start postgresql

# 서비스 시작 대기
sleep 3

# PostgreSQL 연결 확인
if ! pg_isready > /dev/null 2>&1; then
    echo "❌ PostgreSQL 서비스가 실행되지 않았습니다."
    echo ""
    echo "다음 명령어로 수동으로 시작해주세요:"
    echo "  sudo service postgresql start"
    echo "  또는"
    echo "  sudo systemctl start postgresql"
    echo ""
    echo "그 후 이 스크립트를 다시 실행하세요."
    exit 1
fi

echo "✅ PostgreSQL 서비스 실행 중"
echo ""

# 데이터베이스 정보
DB_NAME="test_board_db"
DB_USER="test_board_user"
DB_PASSWORD="test_board_password"

echo "2. 데이터베이스 생성 중..."

# 데이터베이스 생성
sudo -u postgres psql <<EOF
-- 데이터베이스가 이미 존재하는지 확인하고 생성
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

-- 연결 확인
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo "✅ 데이터베이스 생성 완료"
    echo ""
    
    # .env 파일 업데이트
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"
    
    # JWT_SECRET 생성 (openssl이 없으면 기본값 사용)
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
    else
        JWT_SECRET="change-this-secret-key-in-production-$(date +%s)"
    fi
    
    # .env 파일 생성/업데이트
    if [ -f ".env" ]; then
        # 기존 DATABASE_URL 업데이트
        if grep -q "^DATABASE_URL=" .env; then
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
        else
            echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env
        fi
        
        # JWT_SECRET 업데이트 (없으면 추가)
        if ! grep -q "^JWT_SECRET=" .env; then
            echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env
        fi
    else
        # 새 .env 파일 생성
        cat > .env <<ENVEOF
# Database
DATABASE_URL="$DATABASE_URL"

# JWT Secret
JWT_SECRET="$JWT_SECRET"

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
    echo "   - Prisma Client 생성 중..."
    npm run db:generate
    
    if [ $? -ne 0 ]; then
        echo "❌ Prisma Client 생성 실패"
        exit 1
    fi
    
    # 데이터베이스 스키마 적용
    echo "   - 데이터베이스 스키마 적용 중..."
    npm run db:push
    
    if [ $? -eq 0 ]; then
        echo ""
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


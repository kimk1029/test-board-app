# Supabase RLS (Row Level Security) 설정 가이드

## 문제
Supabase에서 다음과 같은 경고가 표시됩니다:
```
RLS Disabled in Public
Table public.Post is public, but RLS has not been enabled.
```

## 해결 방법

### 방법 1: Supabase 대시보드에서 실행 (권장)

1. Supabase 대시보드에 로그인
2. SQL Editor로 이동
3. `supabase-enable-rls-simple.sql` 파일의 내용을 복사하여 실행
4. 또는 `supabase-enable-rls.sql` 파일을 사용하여 더 세밀한 정책 설정

### 방법 2: psql을 사용하여 실행

```bash
# Supabase 데이터베이스에 연결
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# SQL 스크립트 실행
\i supabase-enable-rls-simple.sql
```

### 방법 3: Supabase CLI 사용

```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# Supabase 프로젝트에 연결
supabase link --project-ref [YOUR-PROJECT-REF]

# SQL 스크립트 실행
supabase db execute -f supabase-enable-rls-simple.sql
```

## 파일 설명

### `supabase-enable-rls-simple.sql`
- 간단한 버전
- 모든 테이블에 RLS를 활성화하고 서비스 역할이 모든 작업을 수행할 수 있도록 설정
- Prisma를 통해 접근하는 경우 권장

### `supabase-enable-rls.sql`
- 상세한 버전
- 각 테이블별로 세밀한 정책 설정
- 읽기/쓰기 권한을 더 세밀하게 제어하고 싶은 경우 사용

## 주의사항

1. **Prisma 사용 시**: Prisma는 서비스 역할을 사용하므로, RLS 정책이 너무 제한적이면 Prisma가 데이터베이스에 접근하지 못할 수 있습니다.

2. **애플리케이션 레벨 인증**: 현재 애플리케이션은 Prisma를 통해 데이터베이스에 접근하므로, 인증은 애플리케이션 레벨에서 처리됩니다. RLS는 추가 보안 레이어로 작동합니다.

3. **테스트**: RLS를 활성화한 후 애플리케이션이 정상적으로 작동하는지 확인하세요.

## 확인 방법

RLS가 활성화되었는지 확인하려면:

```sql
-- 모든 테이블의 RLS 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

`rowsecurity`가 `true`로 표시되면 RLS가 활성화된 것입니다.

## 문제 해결

### RLS 활성화 후 애플리케이션이 작동하지 않는 경우

1. 정책이 너무 제한적인지 확인
2. Prisma가 서비스 역할을 사용하는지 확인
3. `supabase-enable-rls-simple.sql`을 사용하여 모든 작업을 허용하는 정책으로 변경

### 특정 테이블만 RLS 비활성화하려면

```sql
ALTER TABLE "TableName" DISABLE ROW LEVEL SECURITY;
```

하지만 보안상 권장되지 않습니다.


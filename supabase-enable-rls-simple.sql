-- Supabase RLS (Row Level Security) 활성화 스크립트 (간단 버전)
-- 모든 테이블에 RLS를 활성화하고 기본 정책을 설정합니다.
-- Prisma를 통해 접근하므로 서비스 역할이 모든 작업을 수행할 수 있도록 설정합니다.

-- 모든 public 스키마의 테이블 목록 가져오기
DO $$
DECLARE
    r RECORD;
BEGIN
    -- 모든 테이블에 대해 RLS 활성화
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- RLS 활성화
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
        
        -- 기존 정책이 있으면 삭제
        EXECUTE format('DROP POLICY IF EXISTS "Enable all for service role" ON %I', r.tablename);
        
        -- 서비스 역할이 모든 작업을 수행할 수 있도록 정책 생성
        EXECUTE format('CREATE POLICY "Enable all for service role" ON %I FOR ALL USING (true) WITH CHECK (true)', r.tablename);
        
        RAISE NOTICE 'RLS enabled for table: %', r.tablename;
    END LOOP;
    
    RAISE NOTICE '✅ 모든 테이블에 RLS가 활성화되었습니다!';
END $$;


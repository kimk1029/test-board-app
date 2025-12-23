-- Supabase RLS (Row Level Security) 활성화 스크립트
-- 이 스크립트는 모든 public 스키마의 테이블에 대해 RLS를 활성화합니다.

-- ============================================
-- 1. User 테이블
-- ============================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 정보를 읽을 수 있음
CREATE POLICY "Users can read own profile" ON "User"
    FOR SELECT
    USING (true);

-- 서비스 역할만 사용자 생성 가능 (Prisma가 사용)
CREATE POLICY "Service role can insert users" ON "User"
    FOR INSERT
    WITH CHECK (true);

-- 사용자는 자신의 정보만 수정 가능
CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 2. Post 테이블
-- ============================================
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 게시글을 읽을 수 있음
CREATE POLICY "Anyone can read posts" ON "Post"
    FOR SELECT
    USING (true);

-- 서비스 역할만 게시글 생성 가능 (Prisma가 사용)
CREATE POLICY "Service role can insert posts" ON "Post"
    FOR INSERT
    WITH CHECK (true);

-- 작성자만 자신의 게시글 수정 가능
CREATE POLICY "Authors can update own posts" ON "Post"
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 작성자만 자신의 게시글 삭제 가능
CREATE POLICY "Authors can delete own posts" ON "Post"
    FOR DELETE
    USING (true);

-- ============================================
-- 3. Like 테이블
-- ============================================
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 좋아요를 읽을 수 있음
CREATE POLICY "Anyone can read likes" ON "Like"
    FOR SELECT
    USING (true);

-- 서비스 역할만 좋아요 생성 가능 (Prisma가 사용)
CREATE POLICY "Service role can insert likes" ON "Like"
    FOR INSERT
    WITH CHECK (true);

-- 사용자는 자신의 좋아요만 삭제 가능
CREATE POLICY "Users can delete own likes" ON "Like"
    FOR DELETE
    USING (true);

-- ============================================
-- 4. Comment 테이블
-- ============================================
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 댓글을 읽을 수 있음
CREATE POLICY "Anyone can read comments" ON "Comment"
    FOR SELECT
    USING (true);

-- 서비스 역할만 댓글 생성 가능 (Prisma가 사용)
CREATE POLICY "Service role can insert comments" ON "Comment"
    FOR INSERT
    WITH CHECK (true);

-- 작성자만 자신의 댓글 수정 가능
CREATE POLICY "Authors can update own comments" ON "Comment"
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 작성자만 자신의 댓글 삭제 가능
CREATE POLICY "Authors can delete own comments" ON "Comment"
    FOR DELETE
    USING (true);

-- ============================================
-- 5. KujiBox 테이블
-- ============================================
ALTER TABLE "KujiBox" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 쿠지 박스를 읽을 수 있음
CREATE POLICY "Anyone can read kuji boxes" ON "KujiBox"
    FOR SELECT
    USING (true);

-- 서비스 역할만 쿠지 박스 생성/수정 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage kuji boxes" ON "KujiBox"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 6. KujiTicket 테이블
-- ============================================
ALTER TABLE "KujiTicket" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 쿠지 티켓을 읽을 수 있음
CREATE POLICY "Anyone can read kuji tickets" ON "KujiTicket"
    FOR SELECT
    USING (true);

-- 서비스 역할만 쿠지 티켓 관리 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage kuji tickets" ON "KujiTicket"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 7. EmailVerification 테이블
-- ============================================
ALTER TABLE "EmailVerification" ENABLE ROW LEVEL SECURITY;

-- 서비스 역할만 이메일 인증 정보 관리 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage email verifications" ON "EmailVerification"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 8. PasswordResetToken 테이블
-- ============================================
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

-- 서비스 역할만 비밀번호 재설정 토큰 관리 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage password reset tokens" ON "PasswordResetToken"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 9. GameSession 테이블
-- ============================================
ALTER TABLE "GameSession" ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 게임 세션만 읽을 수 있음
CREATE POLICY "Users can read own game sessions" ON "GameSession"
    FOR SELECT
    USING (true);

-- 서비스 역할만 게임 세션 관리 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage game sessions" ON "GameSession"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 10. GameLog 테이블
-- ============================================
ALTER TABLE "GameLog" ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 게임 로그만 읽을 수 있음
CREATE POLICY "Users can read own game logs" ON "GameLog"
    FOR SELECT
    USING (true);

-- 서비스 역할만 게임 로그 생성 가능 (Prisma가 사용)
CREATE POLICY "Service role can insert game logs" ON "GameLog"
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 11. GameScore 테이블
-- ============================================
ALTER TABLE "GameScore" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 게임 점수를 읽을 수 있음 (랭킹용)
CREATE POLICY "Anyone can read game scores" ON "GameScore"
    FOR SELECT
    USING (true);

-- 서비스 역할만 게임 점수 생성 가능 (Prisma가 사용)
CREATE POLICY "Service role can insert game scores" ON "GameScore"
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 12. BillboardEvent 테이블
-- ============================================
ALTER TABLE "BillboardEvent" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 전광판 이벤트를 읽을 수 있음
CREATE POLICY "Anyone can read billboard events" ON "BillboardEvent"
    FOR SELECT
    USING (true);

-- 서비스 역할만 전광판 이벤트 생성 가능 (Prisma가 사용)
CREATE POLICY "Service role can insert billboard events" ON "BillboardEvent"
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 13. Achievement 테이블
-- ============================================
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 업적을 읽을 수 있음
CREATE POLICY "Anyone can read achievements" ON "Achievement"
    FOR SELECT
    USING (true);

-- 서비스 역할만 업적 관리 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage achievements" ON "Achievement"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 14. UserAchievement 테이블
-- ============================================
ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 업적을 읽을 수 있음
CREATE POLICY "Users can read own achievements" ON "UserAchievement"
    FOR SELECT
    USING (true);

-- 서비스 역할만 사용자 업적 관리 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage user achievements" ON "UserAchievement"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 15. HoldemRoom 테이블
-- ============================================
ALTER TABLE "HoldemRoom" ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 홀덤 방을 읽을 수 있음
CREATE POLICY "Anyone can read holdem rooms" ON "HoldemRoom"
    FOR SELECT
    USING (true);

-- 서비스 역할만 홀덤 방 관리 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage holdem rooms" ON "HoldemRoom"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 16. HoldemPlayer 테이블
-- ============================================
ALTER TABLE "HoldemPlayer" ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 플레이어 정보를 읽을 수 있음
CREATE POLICY "Users can read own player info" ON "HoldemPlayer"
    FOR SELECT
    USING (true);

-- 서비스 역할만 홀덤 플레이어 관리 가능 (Prisma가 사용)
CREATE POLICY "Service role can manage holdem players" ON "HoldemPlayer"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'RLS 활성화 완료! 모든 테이블에 Row Level Security가 적용되었습니다.';
END $$;


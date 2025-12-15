# 게임 보안 강화 가이드

## 구현된 보안 기능

### 1. 서버 측 게임 결과 검증
- 클라이언트가 보낸 게임 결과를 서버에서 재검증
- 각 게임별 검증 로직 구현

### 2. Rate Limiting
- 초당 최대 10회 베팅 제한
- 과도한 요청 방지

### 3. 베팅 금액 제한
- 최소: 1 포인트
- 최대: 1,000,000 포인트

### 4. 게임별 검증

#### 블랙잭
- 카드 정보를 서버로 전송하여 점수 재계산
- 클라이언트 결과와 서버 계산 결과 비교

#### 그래프 게임 (Bustabit)
- 크래시 포인트 검증
- 배율 검증 (최대 1000배)
- 캐시아웃 여부 확인

#### 룰렛
- 당첨 번호와 베팅 정보를 서버로 전송
- 서버에서 지급액 재계산 및 검증

#### 슬롯머신
- 최대 지급액 제한 (베팅 금액의 1000배)
- 콤보 수 검증

## 클라이언트 코드 수정 필요

현재 서버 측 검증이 추가되었지만, 클라이언트에서 검증 데이터를 보내도록 수정해야 합니다.

### 블랙잭
```typescript
// settleGame 함수에서
body: JSON.stringify({
  action: 'settle',
  result: result,
  betAmount: this.currentBet,
  gameType: 'blackjack',
  playerCards: this.playerHand.cards.map(c => c.value), // 추가 필요
  dealerCards: this.dealerHand.cards.map(c => c.value), // 추가 필요
}),
```

### 그래프 게임
```typescript
// cashOut 또는 processCrashResult에서
body: JSON.stringify({
  action: 'settle',
  result: 'win',
  betAmount: this.betAmount,
  multiplier: this.cashOutMultiplier,
  gameType: 'bustabit',
  crashPoint: this.crashPoint, // 추가 필요
  hasCashedOut: this.hasCashedOut, // 추가 필요
}),
```

### 룰렛
```typescript
// handleResult에서
body: JSON.stringify({
  action: 'settle',
  result: payout > 0 ? 'win' : 'lose',
  amount: payout,
  betAmount: totalBet,
  gameType: 'roulette',
  winningNumber: number, // 추가 필요
  bets: this.bets, // 추가 필요
  claimedPayout: payout, // 추가 필요
}),
```

### 슬롯머신
```typescript
// syncResultToServer에서
body: JSON.stringify({
  action: 'settle',
  amount,
  betAmount,
  result,
  gameType: 'cloverpit',
  comboCount,
  claimedPayout: amount, // 추가 필요
}),
```

## 데이터베이스 마이그레이션

다음 명령어를 실행하여 GameSession 모델을 추가하세요:

```bash
npx prisma db push
```

또는

```bash
npx prisma migrate dev --name add_game_session
```

## 추가 보안 권장사항

1. **게임 세션 추적**: 베팅 시 GameSession을 생성하고, 정산 시 검증
2. **타임스탬프 검증**: 베팅과 정산 사이의 시간 검증
3. **중복 정산 방지**: 같은 세션에 대한 중복 정산 방지
4. **서버 측 랜덤 생성**: 룰렛, 슬롯머신 등의 랜덤 결과를 서버에서 생성

## 현재 상태

- ✅ 서버 측 검증 로직 구현
- ✅ Rate limiting 구현
- ✅ 베팅 금액 제한 구현
- ⚠️ 클라이언트 코드 수정 필요 (검증 데이터 전송)
- ⚠️ GameSession 모델 추가 필요 (DB 마이그레이션)


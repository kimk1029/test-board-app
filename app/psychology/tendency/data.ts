export type TraitKey =
  | 'control'
  | 'care'
  | 'painGive'
  | 'painReceive'
  | 'ropeTop'
  | 'ropeBottom'
  | 'brat'
  | 'tame'
  | 'ownershipTop'
  | 'ownershipBottom'
  | 'service'
  | 'structure'
  | 'novelty'
  | 'aftercare'

export type RoleProfile = {
  key: string
  label: string
  description: string
  traits: Partial<Record<TraitKey, number>>
}

export type TendencyQuestion = {
  id: number
  text: string
  trait: TraitKey
  reverse?: boolean
}

export const tendencyQuestions: TendencyQuestion[] = [
  { id: 1, text: '관계에서 주도권을 잡는 편이 편하다.', trait: 'control' },
  { id: 2, text: '상대가 안전하게 느끼도록 세심히 챙기는 역할이 좋다.', trait: 'care' },
  { id: 3, text: '규칙, 역할, 약속이 분명할수록 안정감을 느낀다.', trait: 'structure' },
  { id: 4, text: '예상 못한 상황과 새로운 시도를 즐기는 편이다.', trait: 'novelty' },
  { id: 5, text: '상대를 리드하기보다 리드받는 편이 더 편하다.', trait: 'control', reverse: true },
  { id: 6, text: '강한 자극보다 부드러운 분위기를 더 선호한다.', trait: 'painGive', reverse: true },
  { id: 7, text: '신뢰가 쌓이면 역할극/컨셉 플레이가 재미있다.', trait: 'novelty' },
  { id: 8, text: '상대의 감정과 반응을 세밀하게 관찰하는 편이다.', trait: 'care' },
  { id: 9, text: '내가 정한 규칙을 지켜지는 것이 중요하다.', trait: 'structure' },
  { id: 10, text: '장난스럽게 도발하고 반응을 보는 편이다.', trait: 'brat' },
  { id: 11, text: '도발을 침착하게 다루고 정리하는 역할이 어울린다.', trait: 'tame' },
  { id: 12, text: '감각 자극 도구/분위기 연출을 준비하는 것이 즐겁다.', trait: 'service' },
  { id: 13, text: '로프나 결박 요소를 설계하고 주도하는 쪽에 끌린다.', trait: 'ropeTop' },
  { id: 14, text: '결박되는 감각이나 몰입감을 즐길 수 있다.', trait: 'ropeBottom' },
  { id: 15, text: '강한 리더십이 필요한 관계 구성이 끌린다.', trait: 'ownershipTop' },
  { id: 16, text: '돌봄과 보호를 받는 관계에서 안정감을 느낀다.', trait: 'ownershipBottom' },
  { id: 17, text: '관계에서 실용적 도움(정리, 준비, 서포트)을 잘하는 편이다.', trait: 'service' },
  { id: 18, text: '상대의 작은 신호도 빠르게 캐치하는 편이다.', trait: 'aftercare' },
  { id: 19, text: '자극을 주는 쪽보다 받는 쪽에 더 가깝다.', trait: 'painReceive' },
  { id: 20, text: '자극을 받는 것보다 주는 쪽이 더 맞다.', trait: 'painGive' },
  { id: 21, text: '관계에서 소속감/전용감이 크면 만족도가 높아진다.', trait: 'ownershipTop' },
  { id: 22, text: '상대에게 맡기고 흐름을 따르는 편이 편하다.', trait: 'ownershipBottom' },
  { id: 23, text: '규칙이 너무 많으면 답답함을 느낀다.', trait: 'structure', reverse: true },
  { id: 24, text: '상대를 귀엽게 챙기고 다독이는 분위기가 잘 맞는다.', trait: 'care' },
  { id: 25, text: '권한과 책임이 명확한 구조에서 성향이 잘 드러난다.', trait: 'ownershipTop' },
  { id: 26, text: '상대가 원하는 포인트를 맞춰 주는 데 보람을 느낀다.', trait: 'service' },
  { id: 27, text: '긴장보다 편안함과 애프터케어가 특히 중요하다.', trait: 'aftercare' },
  { id: 28, text: '도전적 장난을 치고 반응을 보는 편이 재미있다.', trait: 'brat' },
  { id: 29, text: '감정이 과열되면 정리하고 진정시키는 역할을 맡는다.', trait: 'tame' },
  { id: 30, text: '장기적인 역할 분담(예: 관리/보조)이 잘 맞는다.', trait: 'structure' },
  { id: 31, text: '새로운 콘셉트를 자주 시도하면 동기부여가 된다.', trait: 'novelty' },
  { id: 32, text: '주도권 경쟁보다 균형과 협의를 선호한다.', trait: 'control', reverse: true },
  { id: 33, text: '상대를 단단히 리드하고 방향을 제시하는 편이다.', trait: 'control' },
  { id: 34, text: '상대의 주도에 몸을 맡기는 편이 자연스럽다.', trait: 'control', reverse: true },
  { id: 35, text: '강한 소속/헌신 관계에 로망이 있다.', trait: 'ownershipBottom' },
  { id: 36, text: '관계에 장난기와 반전 요소가 있어야 재미있다.', trait: 'novelty' },
]

export const roleProfiles: RoleProfile[] = [
  {
    key: 'rigger',
    label: '리거',
    description: '로프/구속 요소를 설계하고 주도하는 성향입니다. 안전과 준비를 중요하게 봅니다.',
    traits: { ropeTop: 4, control: 2, structure: 1, care: 1 },
  },
  {
    key: 'caregiver',
    label: '대디/마미',
    description: '보호, 돌봄, 정서적 안정 제공에 강점이 있는 성향입니다.',
    traits: { care: 4, aftercare: 3, ownershipTop: 2, structure: 1 },
  },
  {
    key: 'hunter',
    label: '헌터',
    description: '추적/도전적 상호작용을 즐기며, 활력과 긴장감을 만드는 타입입니다.',
    traits: { control: 2, novelty: 3, brat: 1, painGive: 1 },
  },
  {
    key: 'sadist',
    label: '사디스트',
    description: '강한 자극을 주는 쪽에서 몰입감을 느끼는 성향입니다. 신뢰와 합의가 핵심입니다.',
    traits: { painGive: 4, control: 2, structure: 1 },
  },
  {
    key: 'little',
    label: '리틀',
    description: '돌봄받는 분위기, 안정, 애착 중심의 관계에 편안함을 느끼는 성향입니다.',
    traits: { care: 2, ownershipBottom: 3, aftercare: 2, structure: 1 },
  },
  {
    key: 'dominant',
    label: '도미넌트',
    description: '방향 제시, 리드, 규칙 설정 등 주도적 역할에 강한 성향입니다.',
    traits: { control: 4, structure: 3, ownershipTop: 2, tame: 1 },
  },
  {
    key: 'switch',
    label: '스위치',
    description: '상황과 상대에 따라 주도/수용을 유연하게 전환하는 성향입니다.',
    traits: { control: 1, novelty: 3, care: 1, service: 1, ownershipBottom: 1, ownershipTop: 1 },
  },
  {
    key: 'spanker',
    label: '스팽커',
    description: '감각 자극을 주는 쪽의 리듬과 반응 읽기에 강점을 보이는 성향입니다.',
    traits: { painGive: 3, control: 1, care: 1 },
  },
  {
    key: 'owner',
    label: '오너',
    description: '소속감, 관리, 지속적인 관계 책임을 강조하는 성향입니다.',
    traits: { ownershipTop: 4, structure: 3, control: 2, care: 1 },
  },
  {
    key: 'bratTamer',
    label: '브랫 테이머',
    description: '도발적 상호작용을 침착하게 다루고 정리하는 데 강점이 있습니다.',
    traits: { tame: 4, control: 2, structure: 2, care: 1 },
  },
  {
    key: 'degrader',
    label: '디그레이더',
    description: '강한 심리 자극과 긴장감을 다루는 성향입니다. 경계와 합의가 특히 중요합니다.',
    traits: { painGive: 2, control: 2, novelty: 2 },
  },
  {
    key: 'ropeBunny',
    label: '로프버니',
    description: '결박되는 감각, 신뢰 기반 몰입, 수용적 역할에서 만족을 느끼는 성향입니다.',
    traits: { ropeBottom: 4, ownershipBottom: 2, aftercare: 1 },
  },
  {
    key: 'pet',
    label: '펫',
    description: '역할 몰입, 유대감, 애착형 상호작용에 편안함을 느끼는 성향입니다.',
    traits: { ownershipBottom: 3, care: 2, novelty: 2 },
  },
  {
    key: 'submissive',
    label: '서브미시브',
    description: '주도권을 맡기고 가이드에 따르는 관계에서 안정감을 느끼는 성향입니다.',
    traits: { control: -4, ownershipBottom: 3, structure: 2, service: 1 },
  },
  {
    key: 'prey',
    label: '프레이',
    description: '쫓고 쫓기는 역동적 상호작용에서 몰입감을 느끼는 성향입니다.',
    traits: { novelty: 3, brat: 1, ownershipBottom: 1 },
  },
  {
    key: 'master',
    label: '마스터/미스트레스',
    description: '장기적 구조, 권한-책임, 방향성 관리에 강한 상위 주도 성향입니다.',
    traits: { ownershipTop: 4, control: 4, structure: 3, service: -1 },
  },
  {
    key: 'brat',
    label: '브랫',
    description: '장난스럽고 도전적인 방식으로 상호작용을 유도하는 성향입니다.',
    traits: { brat: 4, novelty: 3, control: -1 },
  },
  {
    key: 'vanilla',
    label: '바닐라',
    description: '강한 역할/자극보다 안정적이고 일상적인 친밀감을 선호하는 성향입니다.',
    traits: { painGive: -3, painReceive: -3, novelty: -2, care: 1, aftercare: 1 },
  },
  {
    key: 'slave',
    label: '슬레이브',
    description: '높은 헌신, 구조화된 역할 수행, 장기적 합의에 기반한 관계를 선호합니다.',
    traits: { ownershipBottom: 4, structure: 3, service: 2, control: -3 },
  },
  {
    key: 'masochist',
    label: '마조히스트',
    description: '강한 감각 자극을 받는 쪽에서 몰입을 느끼는 성향입니다.',
    traits: { painReceive: 4, ownershipBottom: 1, aftercare: 1 },
  },
  {
    key: 'spankee',
    label: '스팽키',
    description: '감각 자극을 받는 역할에서 반응과 몰입을 경험하는 성향입니다.',
    traits: { painReceive: 3, ownershipBottom: 1 },
  },
]

export const tendencyOptionLabels = [
  '전혀 아니다',
  '아니다',
  '보통이다',
  '그렇다',
  '매우 그렇다',
]


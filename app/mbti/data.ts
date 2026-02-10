export type MBTIType = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export type Question = {
  id: number;
  text: string;
  type: 'EI' | 'SN' | 'TF' | 'JP';
  answerA: string; // A 선택지 멘트
  answerB: string; // B 선택지 멘트
  agree: MBTIType;    // A 선택 시 점수
  disagree: MBTIType; // B 선택 시 점수
};

export const questions: Question[] = [
  // E vs I (에너지 방향)
  {
    id: 1, text: "대기실에 들어왔을 때 나는?", type: 'EI',
    answerA: "언니들이랑 수다 떨면서 텐션 올린다", agree: 'E',
    answerB: "구석에서 폰 보며 조용히 체력 아낀다", disagree: 'I'
  },
  {
    id: 2, text: "초이스 보러 룸에 들어갔을 때 내 스타일은?", type: 'EI',
    answerA: "손님이랑 눈 마주치며 생글생글 웃는다", agree: 'E',
    answerB: "도도하게 앉아서 지명되길 기다린다", disagree: 'I'
  },
  {
    id: 3, text: "방에서 손님과 단둘이 남았을 때?", type: 'EI',
    answerA: "정적은 싫다! 내가 먼저 말을 건다", agree: 'E',
    answerB: "손님이 말 걸 때까지 가만히 있는다", disagree: 'I'
  },
  {
    id: 4, text: "퇴근 후 내 모습은?", type: 'EI',
    answerA: "한 잔 더 하러 멤버들과 뭉친다", agree: 'E',
    answerB: "기 빨려서 바로 집으로 튀어간다", disagree: 'I'
  },

  // S vs N (인식 기능)
  {
    id: 5, text: "손님 사이즈(견적)를 잴 때 나는?", type: 'SN',
    answerA: "시계, 차 키, 옷 브랜드 등 팩트를 본다", agree: 'S',
    answerB: "딱 봤을 때 느껴지는 '촉'과 분위기를 본다", disagree: 'N'
  },
  {
    id: 6, text: "손님이 '나 돈 많아'라고 자랑할 때 내 속마음은?", type: 'SN',
    answerA: "그래서 지금 현금 얼마 있는데? (현실적)", agree: 'S',
    answerB: "이 오빠랑 잘되면 가게 차려주려나? (상상력)", disagree: 'N'
  },
  {
    id: 7, text: "손님과 대화할 때 더 편한 주제는?", type: 'SN',
    answerA: "골프, 주식, 맛집 등 구체적인 얘기", agree: 'S',
    answerB: "연애관, 인생, 우주 등 뜬구름 잡는 얘기", disagree: 'N'
  },
  {
    id: 8, text: "진상 손님이 말도 안 되는 소리를 할 때?", type: 'SN',
    answerA: "하나하나 따져서 논리로 이겨먹는다", agree: 'S',
    answerB: "영혼 없이 '아~ 그렇구나~' 하고 멍때린다", disagree: 'N'
  },

  // T vs F (판단 기능)
  {
    id: 9, text: "손님이 힘든 회사 일을 털어놓으며 울먹일 때?", type: 'TF',
    answerA: "힘들겠네..(근데 팁은 주나? 시간 언제 끝나지?)", agree: 'T',
    answerB: "같이 글썽이며 진심으로 위로해 준다", disagree: 'F'
  },
  {
    id: 10, text: "담당 실장님이 나한테 쓴소리를 했을 때?", type: 'TF',
    answerA: "내가 뭘 실수했지? 원인을 분석한다", agree: 'T',
    answerB: "나한테 왜 저래? 기분 상해서 마상 입는다", disagree: 'F'
  },
  {
    id: 11, text: "동료 언니가 '나 오늘 일하기 싫어'라고 할 때?", type: 'TF',
    answerA: "그럼 조퇴해, 아님 그냥 참고 해 (해결책)", agree: 'T',
    answerB: "맞아ㅠㅠ 오늘따라 손님도 별로고 힘들지 (공감)", disagree: 'F'
  },
  {
    id: 12, text: "진상에게 욕먹었을 때 멘탈 회복법은?", type: 'TF',
    answerA: "어차피 돈 벌러 왔는데 뭐 (금융치료)", agree: 'T',
    answerB: "친구한테 전화해서 하소연해야 풀림", disagree: 'F'
  },

  // J vs P (생활 양식)
  {
    id: 13, text: "이번 달 목표 매출(TC)은?", type: 'JP',
    answerA: "달력에 하루하루 목표치 적어두고 채운다", agree: 'J',
    answerB: "벌리면 버는 거고, 안 벌리면 마는 거지", disagree: 'P'
  },
  {
    id: 14, text: "출근 준비(메이크업/헤어) 스타일은?", type: 'JP',
    answerA: "예약 시간 딱 맞춰서 계획대로 움직인다", agree: 'J',
    answerB: "늦잠 자다가 택시 안에서 화장하거나 지각한다", disagree: 'P'
  },
  {
    id: 15, text: "쉬는 날 갑자기 손님이 나오라고 연락 오면?", type: 'JP',
    answerA: "아.. 계획 다 틀어지네 (스트레스)", agree: 'J',
    answerB: "오 꽁돈 개이득! 바로 나감 (융통성)", disagree: 'P'
  },
  {
    id: 16, text: "번 돈 관리는 어떻게 해?", type: 'JP',
    answerA: "적금, 월세, 생활비 딱딱 나눠서 관리", agree: 'J',
    answerB: "일단 사고 싶은 명품 지르고 남는 돈으로 생활", disagree: 'P'
  },
];

export const results: Record<string, { title: string; desc: string; imageColor: string }> = {
  'ESTJ': { title: '강남 1타 에이스', desc: '철저한 자기관리와 완벽한 비즈니스 마인드. 실장님들이 제일 좋아하는 타입.', imageColor: 'from-blue-600 to-indigo-900' },
  'ESTP': { title: '텐션 폭발 분위기 메이커', desc: '오늘만 산다. 술자리 분위기 주도하는 핵인싸. 손님보다 더 신나서 노는 타입.', imageColor: 'from-yellow-500 to-orange-700' },
  'ESFJ': { title: '다정다감 힐러 언니', desc: '손님 비위 잘 맞춰주고 동료들도 잘 챙김. 생일 선물 기프티콘 제일 많이 받음.', imageColor: 'from-pink-400 to-rose-600' },
  'ESFP': { title: '끼쟁이 아이돌 재질', desc: '주목받는 거 좋아함. 춤, 노래 시키면 빼지 않고 다 함. 팁 쓸어담는 스타일.', imageColor: 'from-purple-500 to-fuchsia-700' },
  'ENTJ': { title: '야망 있는 가게 오너', desc: '아가씨로 안 끝남. 손님 인맥 쌓아서 나중에 가게 차리거나 사업할 상.', imageColor: 'from-red-600 to-red-900' },
  'ENTP': { title: '말빨 지리는 여우', desc: '손님 머리 꼭대기 위에 있음. 말싸움하면 절대 안 짐. 공사 치기 딱 좋은 능구렁이.', imageColor: 'from-green-500 to-emerald-800' },
  'ENFJ': { title: '달변가 리더 언니', desc: '대기실 반장. 말 잘 통하는 손님 만나면 인생 상담해주고 팁 두둑이 받음.', imageColor: 'from-orange-400 to-red-500' },
  'ENFP': { title: '4차원 매력 탱탱볼', desc: '감정 기복 심함. 기분 좋으면 서비스 최강, 기분 나쁘면 표정 관리 안 됨.', imageColor: 'from-yellow-300 to-yellow-600' },
  'ISTJ': { title: '칼출근 칼퇴근 공무원', desc: '감정 낭비 안 함. 딱 할 만큼만 하고 돈 받아서 집에 감. 실수 안 하는 모범생.', imageColor: 'from-slate-500 to-slate-800' },
  'ISTP': { title: '시크한 도도녀', desc: '영혼 없음. 손님이 뭐라 하든 "네~ 네~" 하고 한 귀로 흘림. 효율 중시.', imageColor: 'from-gray-400 to-gray-700' },
  'ISFJ': { title: '내조의 여왕 지명따', desc: '조용조용하게 손님 다 챙겨줌. 한 번 온 손님은 편안해서 계속 찾게 만듦.', imageColor: 'from-sky-300 to-blue-500' },
  'ISFP': { title: '유리멘탈 집순이', desc: '일은 잘하는데 상처 잘 받음. 집에 가서 이불 킥하고 혼자 삭히는 타입.', imageColor: 'from-teal-300 to-teal-600' },
  'INTJ': { title: '차가운 전략가', desc: '손님 분석 끝판왕. 이 손님이 돈이 될지 안 될지 3초 만에 파악하고 움직임.', imageColor: 'from-indigo-800 to-black' },
  'INTP': { title: '마이웨이 몽상가', desc: '남들한테 관심 없음. 룸 안에서도 자기만의 세계가 있음. 특이한 손님이 좋아함.', imageColor: 'from-violet-600 to-purple-900' },
  'INFJ': { title: '신비주의 팜므파탈', desc: '속을 알 수 없음. 묘한 매력으로 손님 홀림. 가끔 무당 뺨치는 촉을 발휘함.', imageColor: 'from-purple-800 to-indigo-900' },
  'INFP': { title: '비련의 여주인공', desc: '감수성 풍부. 진상 만나면 화장실 가서 울고 옴. 예술적 감각이 있어 옷은 잘 입음.', imageColor: 'from-pink-300 to-purple-400' },
};

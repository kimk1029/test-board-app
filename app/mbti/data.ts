export type MBTIType = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export type Question = {
  id: number;
  text: string;
  type: 'EI' | 'SN' | 'TF' | 'JP';
  agree: MBTIType;
  disagree: MBTIType;
};

export const questions: Question[] = [
  // E vs I
  { id: 1, text: "대기실에 들어왔을 때 나는?", type: 'EI', agree: 'E', disagree: 'I' },
  { id: 2, text: "초이스 보러 룸에 들어갔을 때 내 스타일은?", type: 'EI', agree: 'E', disagree: 'I' },
  { id: 3, text: "방에서 손님과 단둘이 남았을 때?", type: 'EI', agree: 'E', disagree: 'I' },
  { id: 4, text: "퇴근 후 내 모습은?", type: 'EI', agree: 'E', disagree: 'I' },
  // S vs N
  { id: 5, text: "손님 사이즈(견적)를 잴 때 나는?", type: 'SN', agree: 'S', disagree: 'N' },
  { id: 6, text: "손님이 돈 자랑을 시작할 때 내 속마음은?", type: 'SN', agree: 'S', disagree: 'N' },
  { id: 7, text: "손님과 대화할 때 더 편한 주제는?", type: 'SN', agree: 'S', disagree: 'N' },
  { id: 8, text: "진상 손님이 말도 안 되는 소리를 할 때?", type: 'SN', agree: 'S', disagree: 'N' },
  // T vs F
  { id: 9, text: "손님이 힘든 회사 일을 털어놓으며 울먹일 때?", type: 'TF', agree: 'T', disagree: 'F' },
  { id: 10, text: "담당 실장님이 나한테 쓴소리를 했을 때?", type: 'TF', agree: 'T', disagree: 'F' },
  { id: 11, text: "동료 언니가 '나 오늘 일하기 싫어'라고 할 때?", type: 'TF', agree: 'T', disagree: 'F' },
  { id: 12, text: "진상에게 욕먹었을 때 멘탈 회복법은?", type: 'TF', agree: 'T', disagree: 'F' },
  // J vs P
  { id: 13, text: "이번 달 목표 매출(TC)은?", type: 'JP', agree: 'J', disagree: 'P' },
  { id: 14, text: "출근 준비(메이크업/헤어) 스타일은?", type: 'JP', agree: 'J', disagree: 'P' },
  { id: 15, text: "쉬는 날 갑자기 손님이 나오라고 연락 오면?", type: 'JP', agree: 'J', disagree: 'P' },
  { id: 16, text: "번 돈 관리는 어떻게 해?", type: 'JP', agree: 'J', disagree: 'P' },
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

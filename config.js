/* 이키가이 지도 설정
   - server.py 로 띄울 때는 이 파일을 건드리지 않아도 돼요. 서버 옵션(--title, --groups)이 쓰여요.
   - 서버 없이 Google 시트로 응답을 받으려면 collectUrl 에 Apps Script 웹 앱 주소(…/exec)를 넣으세요.
     그러면 참여 화면을 어디에 올려 두든(파일로 열어도) 응답이 그 시트로 가요. README 의 "서버 없이 Google 시트로 받기" 참고. */
window.IKIGAI_CONFIG = {
  // Apps Script 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 바로 아래 작은따옴표 사이에 붙여 넣으세요.
  // // 뒤에 쓴 글자는 설명이라 읽히지 않아요.
  collectUrl: 'https://script.google.com/macros/s/AKfycbyNdhfNjZigVIebFkRVW-f4hHcs-HQcZzzhJ8sJkxMeUtpg51Qr_iHBVP1L4tLSQVsU3g/exec',
  participantUrl: 'https://jeakwon.github.io/ikigai/',    // 참여 화면을 올린 주소. 대시보드 QR 이 이 주소를 가리켜요. 예: 'https://아이디.github.io/ikigai/'
  lang: 'en',            // 처음 열 때의 언어. 'en' 또는 'ko'. 화면 위 버튼으로 언제든 바꿀 수 있어요 (비워 두면 영어)
  nickname: 'optional',  // 결과를 보낼 때 닉네임: 'optional'(적어도 되고 안 적어도 됨), 'required'(꼭 적기), 'off'(묻지 않고 바로 보내기)
  title: 'Ikigai',             // 모임 이름. 예: 'AI 세미나' 또는 { ko: 'AI 세미나', en: 'AI Seminar' }
  groups: ['Student','Postdoc','PI','ETC'],            // 시작 전에 고르는 그룹. 예: ['학부생', '대학원생', '연구원', '기타']. 두 언어로 받으려면 'Student / 학생'처럼
  notice: '',            // 참여 화면 안내 문구. 비우면 기본 문구가 나와요. { ko: '…', en: '…' } 도 돼요
  publicStats: true,     // 결과 화면에서 다른 참여자와 비교해 보여 주기
};

/*! 이키가이 지도 core: content, scoring and the square map.
    Shared by the participant page (index.html) and the dashboard (admin.html).
    server.py mirrors the scoring rules below; keep the two in step. */
(function (root) {
'use strict';

/* =========================================================
   Content
   ========================================================= */
const NIGHT = '#171A2B', TEXT = '#F1ECE4';

/* Language: ?lang= in the address, then the visitor's own choice, then config.js (lang), then English. */
const LANGS = ['ko', 'en'];
function pickLang() {
  const ok = v => (LANGS.includes(String(v || '').toLowerCase()) ? String(v).toLowerCase() : null);
  let q = null, saved = null;
  try { q = ok(new URLSearchParams(location.search).get('lang')); } catch (e) {}
  try { saved = ok(localStorage.getItem('ikigai-map:lang')); } catch (e) {}
  const cfg = ok((root.IKIGAI_CONFIG || {}).lang);
  return q || saved || cfg || 'en';
}
const LANG = pickLang();
try { document.documentElement.lang = LANG; } catch (e) {}
function setLang(l) {
  if (!LANGS.includes(l)) return;
  try { localStorage.setItem('ikigai-map:lang', l); } catch (e) {}
  try { sessionStorage.setItem('ikigai-map:resume', document.body.dataset.view || ''); } catch (e) {}
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.set('lang', l); location.replace(u.toString()); }
  else location.reload();
}
const OTHER_LANG = LANG === 'ko' ? { code:'en', label:'English' } : { code:'ko', label:'한국어' };

// light: the colour of each element's light (3D view). chart: darker step validated for chart marks on the night surface.
const EL = [
  { k:'L', bit:1, name:'좋아하는 것',          short:'좋아함', light:'#FF5A7E', chart:'#EB476E', def:'시키지 않아도 하게 되고, 하다 보면 시간이 사라지는 일' },
  { k:'G', bit:2, name:'잘하는 것',            short:'잘함',   light:'#FFB938', chart:'#C08604', def:'남보다 수월하게 해내고, 주변에서 인정받는 능력' },
  { k:'N', bit:4, name:'세상이 필요로 하는 것', short:'필요',   light:'#4A97FF', chart:'#3785EB', def:'누군가의 문제를 풀고 삶을 조금 낫게 만드는 일' },
  { k:'P', bit:8, name:'돈을 벌 수 있는 것',    short:'수입',   light:'#3BD68A', chart:'#06A765', def:'누군가 기꺼이 값을 치르고, 생활을 꾸릴 수 있는 일' },
];
const KEYS = EL.map(e => e.k);
const BIT = Object.fromEntries(EL.map(e => [e.k, e.bit]));
const ELK = Object.fromEntries(EL.map(e => [e.k, e]));

// r: reverse-scored item
const QUESTIONS = [
  { id:'L1', d:'L', t:'이 일을 하다 보면 시간 가는 줄 모른다.' },
  { id:'L2', d:'L', t:'아무도 시키지 않아도 쉬는 날에 이 일과 관련된 것을 찾아보곤 한다.' },
  { id:'L3', d:'L', t:'돈을 받지 않더라도 이 일을 계속하고 싶다.' },
  { id:'L4', d:'L', t:'이 일에 대해 이야기하다 보면 나도 모르게 신이 난다.' },
  { id:'L5', d:'L', t:'이 일을 할 때 가장 나다운 모습이 된다고 느낀다.' },
  { id:'L6', d:'L', t:'이 분야의 새로운 소식이나 아이디어를 보면 설렌다.' },
  { id:'L7', d:'L', r:1, t:'일요일 저녁, 다음 날 할 일을 생각하면 마음이 무겁다.' },
  { id:'L8', d:'L', r:1, t:'솔직히 이 일은 의무감이나 습관으로 하고 있다.' },
  { id:'G1', d:'G', t:'주변 사람들이 이 분야의 문제로 나에게 조언을 구한다.' },
  { id:'G2', d:'G', t:'남들이 어려워하는 부분을 나는 비교적 수월하게 해낸다.' },
  { id:'G3', d:'G', t:'결과물이나 평가를 통해 이 일의 실력을 인정받은 적이 있다.' },
  { id:'G4', d:'G', t:'이 일에 관해서라면 다른 사람을 가르칠 수 있을 만큼 깊이 안다.' },
  { id:'G5', d:'G', t:'시간이 지날수록 실력이 쌓이고 있다는 것이 느껴진다.' },
  { id:'G6', d:'G', t:'같은 일을 하는 사람들과 비교해도 내 실력이 뒤처지지 않는다.' },
  { id:'G7', d:'G', r:1, t:'이 일을 하다 보면 실력이 부족하다는 사실이 자주 드러난다.' },
  { id:'G8', d:'G', r:1, t:'내가 이 일을 잘한다는 확신이 들지 않는다.' },
  { id:'N1', d:'N', t:'내 일은 누군가의 실제 문제를 해결하거나 삶을 더 낫게 만든다.' },
  { id:'N2', d:'N', t:'내 일이 사라진다면 아쉬워하거나 곤란해질 사람들이 있다.' },
  { id:'N3', d:'N', t:'이 일이 사회나 공동체에 의미 있는 기여를 한다고 믿는다.' },
  { id:'N4', d:'N', t:'내 일의 혜택을 받는 사람들의 얼굴이 구체적으로 떠오른다.' },
  { id:'N5', d:'N', t:'앞으로 이 분야의 중요성은 점점 더 커질 것이다.' },
  { id:'N6', d:'N', t:'내 일 덕분에 도움이 됐다는 말을 들은 적이 있다.' },
  { id:'N7', d:'N', r:1, t:'내 일이 세상에 어떤 영향을 주는지 잘 모르겠다.' },
  { id:'N8', d:'N', r:1, t:'이 일이 없어도 세상은 크게 달라지지 않을 것 같다.' },
  { id:'P1', d:'P', t:'이 일로 생활하기에 충분한 수입을 얻고 있다.' },
  { id:'P2', d:'P', t:'내 기술이나 결과물에 기꺼이 돈을 내려는 사람이나 조직이 있다.' },
  { id:'P3', d:'P', t:'이 일을 계속하면 앞으로 수입이 늘어날 전망이 있다.' },
  { id:'P4', d:'P', t:'이 분야에는 일자리나 수익을 낼 기회가 충분하다.' },
  { id:'P5', d:'P', t:'내가 들이는 시간과 노력에 비해 적절한 보상을 받고 있다.' },
  { id:'P6', d:'P', t:'지금 있는 곳을 떠나도 이 능력으로 다른 곳에서 돈을 벌 수 있다.' },
  { id:'P7', d:'P', r:1, t:'이 일만으로는 경제적으로 불안하다.' },
  { id:'P8', d:'P', r:1, t:'이 일을 계속하려면 다른 수입원이 필요하다.' },
];
// Mixed order: no two neighbours from the same element, two reversed items per page.
const ORDER = [
  'L1','N1','G1','P1','N7','L2','P2','G7',
  'L3','G2','P7','N2','L7','G3','N3','P3',
  'N4','P4','L4','G8','P5','N8','G4','L5',
  'P6','G5','L8','N5','G6','P8','L6','N6',
];
const SCALE = ['전혀 아니다','아니다','약간 아니다','보통이다','약간 그렇다','그렇다','매우 그렇다'];

// The 15 shapes of a tetrahedron (4 vertices, 6 edges, 4 faces, 1 centre) plus 0 = no light yet.
const TYPES = {
  0:  { name:'탐색자', tag:'아직 어느 빛도 켜지지 않았어요',
        desc:'네 빛이 모두 아주 약한 상태예요. 지금 하는 일이 나와 맞지 않거나, 새 길을 찾는 시기일 수 있어요. 그중 가장 덜 어두운 빛 하나를 골라 작게 실험해 보세요.' },
  1:  { name:'몽상가', tag:'좋아하는 마음이 먼저 달려가요',
        desc:'무엇을 좋아하는지는 분명하지만, 아직 실력과 쓸모, 수입으로 이어지지 않았어요. 취미와 가능성 사이에 있는 상태예요. 좋아하는 일을 잘하는 일로 키우는 것이 다음 단계예요.' },
  2:  { name:'숨은 실력자', tag:'잘하지만 아직 빛을 못 봤어요',
        desc:'능력은 있지만 그 일을 즐기지 않고, 쓰일 곳이나 보상도 약해요. 재능이 묵혀 있는 셈이에요. 이 실력을 누가 필요로 하는지 찾으면 빠르게 다른 자리로 옮겨 갈 수 있어요.' },
  4:  { name:'관찰자', tag:'세상의 빈자리가 먼저 보여요',
        desc:'세상에 무엇이 필요한지는 잘 보이지만, 그 일이 아직 나의 애정이나 실력, 수입과 이어져 있지 않아요. 강한 문제의식은 좋은 출발점이에요. 그중 가장 마음이 쓰이는 문제 하나를 골라 보세요.' },
  8:  { name:'생활인', tag:'일은 일일 뿐이에요',
        desc:'수입은 있지만 좋아하지도, 특별히 잘한다고 느끼지도, 의미를 찾지도 못하는 상태예요. 안정은 소중하지만 오래가면 지치기 쉬워요. 일 안팎에서 좋아하는 것과 잘하는 것을 하나씩 늘려 보세요.' },
  3:  { name:'장인', area:'열정', en:'Passion', tag:'좋아하고, 잘해요',
        desc:'좋아하는 일을 잘하기까지 하는, 몰입과 성장이 있는 상태예요. 다만 그 일이 세상에 필요한지, 돈이 되는지는 아직 확인되지 않았어요. 내 작업을 필요로 하는 사람을 찾으면 크게 도약할 수 있어요.' },
  5:  { name:'활동가', area:'사명', en:'Mission', tag:'좋아하고, 세상에 필요해요',
        desc:'애정과 의미가 만나는 뜨거운 자리예요. 하지만 실력과 보상이 받쳐 주지 않으면 열정만으로 버티다 지치기 쉬워요. 전문성을 쌓고 오래 갈 수 있는 수입 구조를 만드는 것이 관건이에요.' },
  10: { name:'전문가', area:'직업', en:'Profession', tag:'잘하고, 돈이 돼요',
        desc:'실력으로 보상받는 탄탄한 커리어 자리예요. 하지만 좋아하는 마음이나 일의 의미가 약하면 성공해도 허전함이 남을 수 있어요. 일 속에서 좋아하는 부분과 내 일이 가닿는 사람을 찾아보세요.' },
  12: { name:'버팀목', area:'천직', en:'Vocation', tag:'세상에 필요하고, 돈이 돼요',
        desc:'사회가 필요로 하고 보상도 따르는, 안정적이고 쓸모 있는 일이에요. 그러나 내가 좋아하거나 특별히 잘하는 일은 아닐 수 있어서, 이게 정말 내 일인가 하는 물음이 생기기 쉬워요.' },
  6:  { name:'재능 기부자', area:'봉사', en:'Service', hidden:true, tag:'잘하고 필요한 일인데, 마음도 지갑도 비어 있어요',
        desc:'실력이 있고 세상에도 쓸모 있는 일을 하지만, 좋아하는 마음도 보상도 상대적으로 약해요. 의무감으로 남을 돕고 있을 가능성이 커요. 보상과 즐거움 중 하나만 채워도 균형이 크게 달라져요.' },
  9:  { name:'행운아', area:'행운', en:'Fortune', hidden:true, tag:'좋아하고 돈도 되지만, 기반이 약해요',
        desc:'좋아하는 일로 돈도 벌고 있지만, 실력에 대한 확신과 일의 의미가 상대적으로 약해요. 운이나 유행이 바뀌면 흔들릴 수 있으니 실력과 쓸모를 단단히 다져 두세요.' },
  7:  { name:'이상가', tag:'기쁘고 충만하지만, 부는 없어요',
        desc:'좋아하고, 잘하고, 세상에도 필요한 일을 하고 있어요. 이키가이 바로 앞이지만 경제적 보상이 상대적으로 약해요. 값을 매기는 법, 후원자나 기관과의 협력처럼 가치를 수입으로 바꾸는 방법이 마지막 퍼즐이에요.' },
  11: { name:'프로 덕후', tag:'만족스럽지만, 쓸모없다는 느낌이 들어요',
        desc:'좋아하고, 잘하고, 돈도 버는 일이에요. 그런데 이 일이 세상에 어떤 의미가 있는지 확신이 부족해요. 내 일이 누구의 삶을 바꾸는지 구체적으로 이어 보면 마지막 빛이 채워져요.' },
  13: { name:'기대주', tag:'설레지만, 불확실해요',
        desc:'좋아하고, 의미 있고, 보상도 있는 일이에요. 그런데 실력에 대한 확신이 부족해요. 기회가 실력보다 앞서 있어 불안할 수 있어요. 의도적인 연습과 피드백으로 전문성을 쌓으면 이키가이에 닿아요.' },
  14: { name:'베테랑', tag:'편안하지만, 공허해요',
        desc:'잘하고, 필요하고, 돈도 되는, 겉으로 보기엔 훌륭한 일이에요. 그런데 마음이 따라오지 않아요. 일의 어떤 순간에 즐거움을 느끼는지 찾거나, 좋아하는 요소를 일에 끌어들이는 것이 필요해요.' },
  15: { name:'이키가이', tag:'네 개의 빛이 고르게 닿아 있어요',
        desc:'좋아하고, 잘하고, 세상에 필요하고, 보상도 따르는 일이에요. 아침에 일어날 이유가 분명한 상태죠. 균형은 계속 변하니, 가장 약한 빛이 꺼지지 않도록 돌봐 주세요.',
        descDim:'네 빛이 고르게 닿아 있지만 아직 약한 상태예요. 균형은 이미 잡혀 있으니, 넷을 함께 조금씩 키우면 이키가이도 그 모양 그대로 커져요. 가장 약한 빛부터 챙겨 보세요.' },
};
const SHAPE_ORDER = [1, 2, 4, 8, 3, 5, 10, 12, 6, 9, 7, 11, 13, 14, 15];   // by number of lights
const TIPS = {
  L:['지난 한 달 중 가장 몰입했던 순간 세 가지를 적고 공통점을 찾아보세요.','지금 하는 일 안에서 좋아하는 부분의 비중을 조금씩 늘릴 수 있는지 살펴보세요.'],
  G:['키우고 싶은 핵심 기술 하나를 정해 석 달 동안 의도적으로 연습해 보세요.','가까운 사람 세 명에게 내가 무엇을 잘한다고 생각하는지 물어보세요.'],
  N:['내 일의 결과를 실제로 쓰는 사람을 만나 무엇이 도움이 되는지 들어 보세요.','내 능력으로 풀 수 있는 다른 사람의 문제 하나를 찾아 작게 시도해 보세요.'],
  P:['내 일에 돈을 낼 만한 사람이나 조직을 구체적으로 적어 보세요.','작은 유료 프로젝트로 시장의 반응을 먼저 확인해 보세요.'],
};

/* English. Same items, same order and same reverse-scored statements; only the words change. */
const EN = {
  el: {
    L:{ name:'What you love',            short:'Love',  def:'Things you do without being asked, where time slips away' },
    G:{ name:'What you\'re good at',      short:'Skill', def:'Abilities that come easier to you than to others, and that people recognize' },
    N:{ name:'What the world needs',     short:'Need',  def:'Work that solves someone\'s problem and makes life a little better' },
    P:{ name:'What you can be paid for', short:'Pay',   def:'Work someone will gladly pay for, and that you can live on' },
  },
  q: {
    L1:'When I\'m doing this work, I lose track of time.',
    L2:'Even on my days off, with no one asking, I find myself looking into things related to this work.',
    L3:'I would want to keep doing this work even if I weren\'t paid for it.',
    L4:'When I talk about this work, I can\'t help getting excited.',
    L5:'I feel most like myself when I\'m doing this work.',
    L6:'New ideas or news in this field excite me.',
    L7:'On Sunday evenings, thinking about the work ahead weighs on me.',
    L8:'Honestly, I do this work out of obligation or habit.',
    G1:'People around me come to me for advice on problems in this field.',
    G2:'Parts that others find hard, I handle with relative ease.',
    G3:'My skill in this work has been recognized through my results or evaluations.',
    G4:'I know this work well enough to teach it to others.',
    G5:'I can feel my skills building up over time.',
    G6:'Compared with others who do the same work, my skills hold up.',
    G7:'In this work, my lack of skill often shows.',
    G8:'I\'m not confident that I\'m good at this work.',
    N1:'My work solves real problems for people or makes their lives better.',
    N2:'If my work disappeared, some people would miss it or be worse off.',
    N3:'I believe this work makes a meaningful contribution to society or my community.',
    N4:'I can clearly picture the people who benefit from my work.',
    N5:'This field will only become more important in the years ahead.',
    N6:'People have told me that my work helped them.',
    N7:'I\'m not sure what difference my work makes in the world.',
    N8:'The world would be much the same without this work.',
    P1:'This work earns me enough to live on.',
    P2:'There are people or organizations willing to pay for my skills or what I produce.',
    P3:'If I keep doing this work, my income is likely to grow.',
    P4:'This field offers plenty of jobs or ways to earn.',
    P5:'I\'m fairly paid for the time and effort I put in.',
    P6:'Even if I left where I am now, I could earn a living elsewhere with these skills.',
    P7:'This work alone leaves me financially insecure.',
    P8:'To keep doing this work, I need another source of income.',
  },
  scale: ['Strongly disagree', 'Disagree', 'Somewhat disagree', 'Neutral', 'Somewhat agree', 'Agree', 'Strongly agree'],
  types: {
    0:  { name:'Explorer', tag:'None of the lights is on yet',
          desc:'All four lights are very dim. Your current work may not suit you, or you may be in a season of looking for a new path. Pick the least dim of the four and try a small experiment with it.' },
    1:  { name:'Dreamer', tag:'Your heart runs ahead',
          desc:'You know clearly what you love, but it hasn\'t turned into skill, usefulness or income yet. You\'re somewhere between a hobby and a possibility. The next step is growing what you love into something you\'re good at.' },
    2:  { name:'Hidden talent', tag:'Skilled, but not yet seen',
          desc:'You have the ability, but you don\'t enjoy the work, and it brings little use or reward. Your talent is sitting idle. Find out who needs this skill and you can move somewhere new quickly.' },
    4:  { name:'Observer', tag:'You see the world\'s gaps first',
          desc:'You can see clearly what the world needs, but it isn\'t yet tied to your love, your skills or your income. A strong sense of the problem is a good place to start. Pick the one problem you care about most.' },
    8:  { name:'Earner', tag:'Work is just work',
          desc:'You earn an income, but you don\'t love the work, don\'t feel especially good at it, and don\'t find meaning in it. Stability matters, but this can wear you down over time. Add one thing you love and one thing you\'re good at, inside or outside work.' },
    3:  { name:'Craftsperson', area:'Passion', tag:'You love it, and you\'re good at it',
          desc:'You\'re good at what you love: a place of focus and growth. But whether the world needs it, or whether it pays, hasn\'t been tested yet. Find the people who need your work and you can take a big leap.' },
    5:  { name:'Activist', area:'Mission', tag:'You love it, and the world needs it',
          desc:'A warm place where love meets meaning. But without skill and pay to back it up, passion alone can burn you out. The key is to build expertise and an income you can sustain.' },
    10: { name:'Expert', area:'Profession', tag:'You\'re good at it, and it pays',
          desc:'A solid career where your skill is rewarded. But if love or meaning is weak, even success can feel hollow. Look for the parts of the work you enjoy, and for the people your work reaches.' },
    12: { name:'Pillar', area:'Vocation', tag:'The world needs it, and it pays',
          desc:'Stable, useful work that society needs and that pays. But it may not be what you love or are especially good at, so you may find yourself asking whether this is really your work.' },
    6:  { name:'Giver', area:'Service', tag:'Skilled and needed, but your heart and wallet are empty',
          desc:'You\'re skilled and your work is useful, but both love and pay are relatively weak. You may be helping others mostly out of duty. Filling in just one of pay or enjoyment would change the balance a lot.' },
    9:  { name:'Lucky one', area:'Fortune', tag:'You love it and it pays, but the footing is thin',
          desc:'You earn money doing what you love, but your confidence in your skills and the meaning of the work are relatively weak. A change in luck or trends could shake you, so shore up your skills and your usefulness.' },
    7:  { name:'Idealist', tag:'Delight and fullness, but no wealth',
          desc:'You love it, you\'re good at it, and the world needs it. You\'re right next to ikigai, but the financial reward is relatively weak. The last piece is turning value into income: pricing your work, or partnering with sponsors or institutions.' },
    11: { name:'Pro enthusiast', tag:'Satisfied, but feeling useless',
          desc:'You love it, you\'re good at it, and it pays. But you\'re not sure what it means for the world. Connect your work to the specific people whose lives it changes, and the last light fills in.' },
    13: { name:'Rising star', tag:'Excited, but uncertain',
          desc:'You love it, it matters, and it pays. But you lack confidence in your skills. Opportunity is running ahead of ability, which can feel unsettling. Build expertise through deliberate practice and feedback, and you\'ll reach ikigai.' },
    14: { name:'Veteran', tag:'Comfortable, but empty',
          desc:'You\'re good at it, it\'s needed, and it pays: work that looks great from the outside. But your heart isn\'t in it. Notice which moments of the work you enjoy, or bring things you love into it.' },
    15: { name:'Ikigai', tag:'All four lights reach you evenly',
          desc:'You love it, you\'re good at it, the world needs it, and it pays. You have a clear reason to get up in the morning. Balance keeps shifting, so look after your weakest light so it doesn\'t go out.',
          descDim:'All four lights reach you evenly, but they\'re still faint. The balance is already there, so grow all four a little at a time and your ikigai grows in the same shape. Start with your weakest light.' },
  },
  tips: {
    L:['Write down the three moments from the past month when you were most absorbed, and look for what they share.', 'See whether you can gradually grow the share of your current work that you enjoy.'],
    G:['Pick one core skill you want to grow and practice it deliberately for three months.', 'Ask three people close to you what they think you\'re good at.'],
    N:['Meet someone who actually uses the results of your work and hear what helps them.', 'Find one problem someone else has that your skills could solve, and try a small first step.'],
    P:['Write down the specific people or organizations who might pay for your work.', 'Test the market first with a small paid project.'],
  },
};
if (LANG === 'en') {
  EL.forEach(e => Object.assign(e, EN.el[e.k]));
  QUESTIONS.forEach(q => { q.t = EN.q[q.id]; });
  SCALE.splice(0, SCALE.length, ...EN.scale);
  Object.keys(TYPES).forEach(m => { const t = TYPES[m]; delete t.en; Object.assign(t, EN.types[m]); });
  Object.keys(TIPS).forEach(k => { TIPS[k] = EN.tips[k]; });
}
// words the renderer and the pages share
const WORDS = LANG === 'en'
  ? { center:'Ikigai', me:'Me', none:'None', glow:['Radiant', 'Clear', 'Soft', 'Faint'] }
  : { center:'이키가이', me:'나', none:'없음', glow:['환한', '또렷한', '은은한', '희미한'] };

/* =========================================================
   Scoring  (mirrored in server.py)
   ========================================================= */
const RHO = 0.75;        // a light counts as "on" when it reaches 75% of your brightest light
const NO_LIGHT = 0.15;   // below this everywhere, no shape has formed yet
const EPS = 1e-9;

function computeScores(ans) {
  const sum = { L:0, G:0, N:0, P:0 }, n = { L:0, G:0, N:0, P:0 };
  for (const q of QUESTIONS) {
    const v = ans[q.id]; if (!v) continue;
    const x = q.r ? 8 - v : v;
    sum[q.d] += (x - 1) / 6; n[q.d]++;
  }
  const s = {}; for (const k of KEYS) s[k] = n[k] ? sum[k] / n[k] : 0.5;
  return s;
}
const maxOf = s => Math.max(s.L, s.G, s.N, s.P);
const coreOf = s => Math.min(s.L, s.G, s.N, s.P);           // ikigai size: the part all four lights reach
function shapeOf(s) {
  const mx = maxOf(s);
  if (mx < NO_LIGHT) return 0;
  let m = 0; for (const e of EL) if (s[e.k] >= RHO * mx - EPS) m |= e.bit;
  return m;
}
const members = m => EL.filter(e => m & e.bit);
const level = m => members(m).length;
function glowOf(s, m) {                                       // brightness of the lights that form the shape
  const on = members(m); if (!on.length) return maxOf(s);
  return on.reduce((a, e) => a + s[e.k], 0) / on.length;
}
const glowWord = v => WORDS.glow[v >= 0.75 ? 0 : v >= 0.55 ? 1 : v >= 0.35 ? 2 : 3];
// Where the shape points, without its size: each light relative to the brightest, sharpened so that
// one-light shapes sit by their vertex, two-light shapes by their edge, three by their face, four in the middle.
const SHARP = 4;
function balance(s) {
  const mx = maxOf(s); if (!(mx > 0)) return [0.25, 0.25, 0.25, 0.25];
  const v = KEYS.map(k => Math.pow(s[k] / mx, SHARP)), t = v.reduce((a, b) => a + b, 0);
  return v.map(x => x / t);
}
function analyzeScores(s) {
  const shape = shapeOf(s), core = coreOf(s), glow = glowOf(s, shape);
  const sorted = EL.slice().sort((a, b) => s[a.k] - s[b.k]);
  const place = placeOf(shape, s);
  return { s, shape, core, glow, word:glowWord(glow), weakest:sorted[0], second:sorted[1], w:balance(s), place, pos:locate(s, place) };
}
const analyze = ans => analyzeScores(computeScores(ans));
const shapeLabel = m => m ? members(m).map(e => e.short).join('+') : WORDS.none;

/* =========================================================
   Small helpers
   ========================================================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const rgbCss = (c, a = 1) => `rgba(${Math.round(clamp(c[0], 0, 1) * 255)},${Math.round(clamp(c[1], 0, 1) * 255)},${Math.round(clamp(c[2], 0, 1) * 255)},${a})`;
const rgbHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
EL.forEach(e => { e.rgb = hexRgb(e.light); });
const NIGHT_RGB = hexRgb(NIGHT);
// lights add up like stage lights (screen blend) over the night background
function mixLights(weights, gain = 1) {
  let r = 1 - NIGHT_RGB[0], g = 1 - NIGHT_RGB[1], b = 1 - NIGHT_RGB[2];
  EL.forEach((e, i) => { const a = clamp(weights[i] * gain, 0, 1); r *= 1 - a * e.rgb[0]; g *= 1 - a * e.rgb[1]; b *= 1 - a * e.rgb[2]; });
  return [1 - r, 1 - g, 1 - b];
}
const maskWeights = (m, a = 0.62) => EL.map(e => (m & e.bit) ? a : 0);
const hasJong = w => { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
const qt = s => `‘${s}’`;
const qj = (w, withJong, without) => qt(w) + (hasJong(w) ? withJong : without);
const pct = v => Math.round(v * 100);

/* =========================================================
   The square map
   The familiar four-circle diagram drawn as four overlapping squares on a 600 × 600 grid of five bands:
   좋아하는 것 on top, 잘하는 것 left, 세상이 필요로 하는 것 right, 돈을 벌 수 있는 것 below.
   It has 13 cells. The two opposite pairs (잘하는 것 + 세상의 필요, 좋아하는 것 + 돈) never overlap on
   their own, so people with those two shapes are shown in the cell that describes them best.
   ========================================================= */
const SANS = "'IBM Plex Sans KR','IBM Plex Sans','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
const SERIF = "Hahmlet,'Noto Serif KR',AppleMyungjo,Batang,serif";
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const B = [0, 102, 234, 366, 498, 600];
const box = (c0, r0, c1, r1) => ({ x:B[c0], y:B[r0], w:B[c1] - B[c0], h:B[r1] - B[r0] });
const REG = {
  1:box(1,0,4,1), 2:box(0,1,1,4), 4:box(4,1,5,4), 8:box(1,4,4,5),
  3:box(1,1,2,2), 7:box(2,1,3,2), 5:box(3,1,4,2),
  11:box(1,2,2,3), 15:box(2,2,3,3), 13:box(3,2,4,3),
  10:box(1,3,2,4), 14:box(2,3,3,4), 12:box(3,3,4,4),
};
const REG_ORDER = [1, 2, 4, 8, 3, 7, 5, 11, 15, 13, 10, 14, 12];
const CORNERS = [
  { box:box(0,0,1,1), arms:[1,2] }, { box:box(4,0,5,1), arms:[1,4] },
  { box:box(0,4,1,5), arms:[2,8] }, { box:box(4,4,5,5), arms:[4,8] },
];
const ELRECT = { L:box(1,0,4,3), G:box(0,1,3,4), N:box(2,1,5,4), P:box(1,2,4,5) };
const CELLS = REG_ORDER.map(m => ({ mask:m, box:REG[m] })).concat(CORNERS.map(c => ({ mask:0, box:c.box })));
const OFF_MAP = [6, 9];
const boxCenter = b => [b.x + b.w / 2, b.y + b.h / 2];
const kindOf = m => m === 0 ? 'corner' : (m === 1 || m === 8) ? 'harm' : (m === 2 || m === 4) ? 'varm' : 'cell';
const elOfBit = bit => EL.find(e => e.bit === bit);
const r1 = v => Math.round(v * 10) / 10;
const escX = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const MAPW = LANG === 'en'
  ? { aria:'Ikigai map', mine:'your place', sub:'生き甲斐',
      tri:{ 7:['Delight,', 'but no wealth'], 11:['Satisfied,', 'but useless'], 13:['Excited,', 'but uncertain'], 14:['Comfortable,', 'but empty'] } }
  : { aria:'이키가이 지도', mine:'내 자리', sub:'生き甲斐',
      tri:{ 7:['기쁘고 충만하지만', '부는 없음'], 11:['만족스럽지만', '쓸모없는 느낌'], 13:['설레지만', '불확실함'], 14:['편안하지만', '공허함'] } };

// label sizes: 'full' on a person's own map, 'compact' on a map full of people
let mctx = null;
function textW(t, size, weight = 600, fam = SANS) {
  try { mctx = mctx || document.createElement('canvas').getContext('2d'); mctx.font = `${weight} ${size}px ${fam}`; return mctx.measureText(t).width * 1.05; }
  catch (e) { return String(t).length * size * 0.6; }
}
const UPRIGHT = LANG !== 'en';   // Korean stands upright glyph by glyph; English is turned on its side
const vAdv = (ch, size) => ch === ' ' ? size * 0.45 : size * 1.12;
const vLen = (m, size) => { const n = elOfBit(m).name; return UPRIGHT ? [...n].reduce((a, ch) => a + vAdv(ch, size), 0) : textW(n, size); };
const LBL = {
  full:   { name:20, cellLZ:58, harm:m => Math.max(172, textW(elOfBit(m).name, 20) + 48), varm:m => vLen(m, 20) + 72 },
  compact:{ name:16, cellLZ:40, harm:m => textW(elOfBit(m).name, 16) + 34, varm:m => vLen(m, 16) + 30 },
};

/* where a person goes */
// how clearly each light counts as on, relative to the brightest light (exactly 0.5 on the 75% line)
function onness(s) {
  const mx = maxOf(s) || 1, o = {};
  for (const k of KEYS) o[k] = clamp((s[k] / mx - 0.5) * 2, 0.02, 0.98);
  return o;
}
function fit(mask, o) { let p = 1; for (const e of EL) p *= (mask & e.bit) ? o[e.k] : 1 - o[e.k]; return p; }
// 잘하는 것 and 세상의 필요 overlap only in the middle column (7, 15, 14); 좋아하는 것 and 돈 only in the middle row
// (11, 15, 13). Those two shapes go to the cell of that column or row on the side of the brighter of the other two lights.
function placeOf(shape, s) {
  if (shape === 6) return s.L > s.P ? 7 : 14;
  if (shape === 9) return s.G > s.N ? 11 : 13;
  return shape;
}
function cornerOf(s) {
  let best = -1, idx = 0;
  CORNERS.forEach((c, i) => { const v = c.arms.reduce((a, bit) => a + s[elOfBit(bit).k], 0); if (v > best) { best = v; idx = i; } });
  return idx;
}
function sharedEdgeMid(a, b) {
  const ax2 = a.x + a.w, ay2 = a.y + a.h, bx2 = b.x + b.w, by2 = b.y + b.h;
  if (ax2 === b.x || bx2 === a.x) {
    const X = ax2 === b.x ? ax2 : a.x, y0 = Math.max(a.y, b.y), y1 = Math.min(ay2, by2);
    if (y1 > y0) return [X, (y0 + y1) / 2];
  }
  if (ay2 === b.y || by2 === a.y) {
    const Y = ay2 === b.y ? ay2 : a.y, x0 = Math.max(a.x, b.x), x1 = Math.min(ax2, bx2);
    if (x1 > x0) return [(x0 + x1) / 2, Y];
  }
  return null;
}
// inside its own cell, leaning toward the neighbouring cell it is closest to becoming
const PULL = 0.8, PIN_R = 20, EDGE = 24;
function pullOf(b, place, o) {
  const [cx, cy] = boxCenter(b), f0 = fit(place, o);
  let dx = 0, dy = 0;
  for (const n of CELLS) {
    if (n.box === b || n.mask === 0) continue;
    const e = sharedEdgeMid(b, n.box); if (!e) continue;
    const w = Math.min(1, fit(n.mask, o) / f0);
    dx += w * (e[0] - cx) * PULL; dy += w * (e[1] - cy) * PULL;
  }
  return [dx, dy];
}
// the part of a cell a pin or a dot may use, leaving room for the cell's name on the side given by zone
function freeArea(place, zone, r, edge, size) {
  const b = REG[place], kind = kindOf(place), L = LBL[size];
  let xr = [b.x + edge, b.x + b.w - edge], yr = [b.y + edge, b.y + b.h - edge];
  if (kind === 'cell') {
    if (zone === 'start') yr = [b.y + L.cellLZ + r + 2, b.y + b.h - edge]; else if (zone === 'end') yr = [b.y + edge, b.y + b.h - L.cellLZ - r - 2];
  } else if (kind === 'harm') {
    const LZ = L.harm(place);
    if (zone === 'start') xr = [b.x + LZ + r, b.x + b.w - edge]; else if (zone === 'end') xr = [b.x + edge, b.x + b.w - LZ - r];
  } else if (kind === 'varm') {
    const LZ = L.varm(place);
    if (zone === 'start') yr = [b.y + LZ + r, b.y + b.h - edge]; else if (zone === 'end') yr = [b.y + edge, b.y + b.h - LZ - r];
  }
  if (xr[0] > xr[1]) xr = [(xr[0] + xr[1]) / 2, (xr[0] + xr[1]) / 2];
  if (yr[0] > yr[1]) yr = [(yr[0] + yr[1]) / 2, (yr[0] + yr[1]) / 2];
  return { xr, yr };
}
function locate(s, place) {
  if (place === 0) { const corner = cornerOf(s), b = CORNERS[corner].box, [x, y] = boxCenter(b); return { box:b, corner, zone:'center', x, y }; }
  const b = REG[place], [cx, cy] = boxCenter(b), [dx, dy] = pullOf(b, place, onness(s));
  const zone = kindOf(place) === 'harm' ? (dx >= 0 ? 'start' : 'end') : (dy >= 0 ? 'start' : 'end');
  const { xr, yr } = freeArea(place, zone, PIN_R, EDGE, 'full');
  return { box:b, corner:-1, zone, x:clamp(cx + dx, xr[0], xr[1]), y:clamp(cy + dy, yr[0], yr[1]) };
}

/* many people on one map: each dot in its own cell, leaning the way its pin would, then pushed apart */
function crowdLayout(list, r = 7) {
  const pts = list.map((d, i) => {
    const big = d.r || 0;
    const place = placeOf(d.shape, d.s);
    let b, xr, yr, x, y;
    if (place === 0) {
      b = CORNERS[cornerOf(d.s)].box; xr = [b.x + r + 8, b.x + b.w - r - 8]; yr = [b.y + r + 8, b.y + b.h - r - 8]; [x, y] = boxCenter(b);
    } else {
      b = REG[place]; ({ xr, yr } = freeArea(place, 'start', r, r + 8, 'compact'));
      const [cx, cy] = boxCenter(b), [dx, dy] = pullOf(b, place, onness(d.s));
      x = clamp(cx + dx, xr[0], xr[1]); y = clamp(cy + dy, yr[0], yr[1]);
    }
    return { i, place, b, xr, yr, x, y, r, big };
  });
  const groups = new Map();
  pts.forEach(p => { if (!groups.has(p.b)) groups.set(p.b, []); groups.get(p.b).push(p); });
  for (const g of groups.values()) {
    const A = (g[0].xr[1] - g[0].xr[0] + 2 * r) * (g[0].yr[1] - g[0].yr[0] + 2 * r), cap = A / Math.pow(2 * r + 6, 2);
    const rr = g.length > cap ? Math.max(3.5, r * Math.sqrt(cap / g.length)) : r;
    g.forEach((p, k) => { p.r = p.big || rr; const a = k * 2.399963, d = 1.5 * Math.sqrt(k); p.x += Math.cos(a) * d; p.y += Math.sin(a) * d; });
    for (let it = 0; it < 160; it++) {
      let moved = false;
      for (let a = 0; a < g.length; a++) for (let c = a + 1; c < g.length; c++) {
        const P = g[a], Q = g[c], minD = P.r + Q.r + 4; let dx = Q.x - P.x, dy = Q.y - P.y, d = Math.hypot(dx, dy);
        if (d >= minD) continue;
        if (d < 1e-6) { const t = (a * 7 + c * 13) * 0.7; dx = Math.cos(t); dy = Math.sin(t); d = 1; }
        const push = (minD - d) / 2 + 0.05; dx /= d; dy /= d;
        P.x -= dx * push; P.y -= dy * push; Q.x += dx * push; Q.y += dy * push; moved = true;
      }
      g.forEach(p => { const e = p.r - r; p.x = clamp(p.x, p.xr[0] + e, p.xr[1] - e); p.y = clamp(p.y, p.yr[0] + e, p.yr[1] - e); });
      if (!moved) break;
    }
  }
  return pts;
}
// names next to dots: below, right, left or above, wherever nothing else is; otherwise left for the tooltip
function crowdLabels(pts, names, fs = 11) {
  const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const obst = pts.map(p => ({ x:p.x - p.r - 1.5, y:p.y - p.r - 1.5, w:2 * p.r + 3, h:2 * p.r + 3 }));
  for (const m of REG_ORDER) {   // each cell's own name
    const b = REG[m], k = kindOf(m), L = LBL.compact;
    if (k === 'cell') obst.push({ x:b.x, y:b.y, w:b.w, h:L.cellLZ });
    else if (k === 'harm') obst.push({ x:b.x, y:b.y, w:L.harm(m), h:b.h });
    else obst.push({ x:b.x, y:b.y, w:b.w, h:L.varm(m) });
  }
  const placed = [], out = pts.map(() => null);
  const order = pts.map((p, i) => i).sort((a, b) => pts[a].y - pts[b].y || pts[a].x - pts[b].x);
  for (const i of order) {
    const p = pts[i], t = names[i]; if (!t) continue;
    const w = textW(t, fs), h = fs + 3, gap = p.r + 3;
    for (const [dx, dy, a] of [[0, gap + h / 2, 'middle'], [gap, 0, 'start'], [-gap, 0, 'end'], [0, -(gap + h / 2), 'middle']]) {
      const x0 = a === 'start' ? p.x + dx : a === 'end' ? p.x + dx - w : p.x + dx - w / 2, bx = { x:x0, y:p.y + dy - h / 2, w, h };
      if (bx.x < p.b.x + 2 || bx.x + bx.w > p.b.x + p.b.w - 2 || bx.y < p.b.y + 2 || bx.y + bx.h > p.b.y + p.b.h - 2) continue;
      if (obst.some((o, j) => j !== i && ov(bx, o)) || placed.some(o => ov(bx, o))) continue;
      placed.push(bx); out[i] = { x:dx, y:dy, a, fs }; break;
    }
  }
  return out;
}

/* colour: each light is a stage light; where they overlap they add up (screen blend) */
const FULL = { L:.66, G:.78, N:.66, P:.62 };   // per-light strength, so each one reads as light (dim amber looks brown)
const lightLevel = I => Math.min(...EL.map(e => I[e.k] / FULL[e.k]));
function regionRGB(mask, I) {
  let r = 1 - NIGHT_RGB[0], g = 1 - NIGHT_RGB[1], b = 1 - NIGHT_RGB[2];
  for (const e of EL) if (mask & e.bit) { const a = I[e.k]; r *= 1 - a * e.rgb[0]; g *= 1 - a * e.rgb[1]; b *= 1 - a * e.rgb[2]; }
  let out = [1 - r, 1 - g, 1 - b];
  if (mask === 15) { const t = 0.34 * lightLevel(I); out = out.map(v => v + (1 - v) * t); }
  return out;
}
const lin = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const contrastOf = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const INK_LIGHT = '#F6F2EA';
function inkFor(rgb) { const L = lum(rgb); return contrastOf(L, lum(NIGHT_RGB)) >= contrastOf(L, lum(hexRgb(INK_LIGHT))) ? NIGHT : INK_LIGHT; }

/* SVG */
const SQ_R = 22, SQ_INSET = { L:3, G:3, N:9, P:9 };   // the pairs that share a side (L and P, G and N) get different insets
EL.forEach(e => { e.rim = rgbHex(e.rgb.map(v => v + (1 - v) * 0.38)); });
const sqFill = (e, I) => rgbHex(e.rgb.map(v => v * I[e.k]));
const coreFill = I => { const t = 0.34 * lightLevel(I); return rgbHex([t, t, t]); };   // the extra light where all four meet
const rectS = (b, attrs) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" ${attrs}/>`;
const txt = (x, y, s, size, weight, fam, fill, op = 1, cls = '') =>
  `<text x="${r1(x)}" y="${r1(y)}" text-anchor="middle" dominant-baseline="central" font-family="${fam}" font-size="${size}" font-weight="${weight}" fill="${fill}"${op < 1 ? ` fill-opacity="${op}"` : ''}${cls ? ` class="${cls}"` : ''}>${escX(s)}</text>`;
function vtxt(x, cy, s, size, weight, fill, rot) {
  if (!UPRIGHT) return `<text x="${r1(x)}" y="${r1(cy)}" transform="rotate(${rot} ${r1(x)} ${r1(cy)})" text-anchor="middle" dominant-baseline="central" font-family="${SANS}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escX(s)}</text>`;
  const chars = [...s], total = chars.reduce((a, ch) => a + vAdv(ch, size), 0);
  let y = cy - total / 2;
  const spans = chars.map(ch => { const a = vAdv(ch, size), mid = y + a / 2; y += a; return ch === ' ' ? '' : `<tspan x="${r1(x)}" y="${r1(mid)}">${escX(ch)}</tspan>`; }).join('');
  return `<text text-anchor="middle" dominant-baseline="central" font-family="${SANS}" font-size="${size}" font-weight="${weight}" fill="${fill}" aria-label="${escX(s)}">${spans}</text>`;
}
function regionLabel(m, fg, zone, s, size) {
  const b = REG[m], [cx, cy] = boxCenter(b), kind = kindOf(m), T = TYPES[m], out = [], cmp = size === 'compact', L = LBL[size];
  if (kind === 'harm') {
    const e = elOfBit(m), LZ = L.harm(m), lx = zone === 'start' ? b.x + LZ / 2 : zone === 'end' ? b.x + b.w - LZ / 2 : cx;
    if (s) { out.push(txt(lx, cy - 11, e.name, L.name, 600, SANS, fg)); out.push(txt(lx, cy + 16, pct(s[e.k]) + '%', 15, 500, SANS, fg, .8)); }
    else out.push(txt(lx, cy, e.name, L.name, 600, SANS, fg));
  } else if (kind === 'varm') {
    const e = elOfBit(m), len = vLen(m, L.name), extra = s ? 30 : 0;
    let ly = cy - extra / 2;
    if (zone === 'start') ly = b.y + (cmp ? 14 : 28) + len / 2;
    else if (zone === 'end') ly = b.y + b.h - 28 - extra - len / 2;
    out.push(vtxt(cx, ly, e.name, L.name, 600, fg, m === 2 ? -90 : 90));
    if (s) out.push(txt(cx, ly + len / 2 + 24, pct(s[e.k]) + '%', 15, 500, SANS, fg, .8));
  } else if (m === 15) {
    if (cmp) out.push(txt(cx, b.y + 21, WORDS.center, 18, 650, SERIF, fg));
    else {
      const ly = zone === 'start' ? b.y + 34 : zone === 'end' ? b.y + b.h - 36 : cy - 4;
      out.push(txt(cx, ly - 6, WORDS.center, 23, 650, SERIF, fg)); out.push(txt(cx, ly + 18, MAPW.sub, 12, 500, SANS, fg, .72, 'sub'));
    }
  } else if (T.area) {
    if (cmp) out.push(txt(cx, b.y + 21, T.area, LANG === 'en' ? 15 : 17, 600, SERIF, fg));
    else {
      const ly = zone === 'start' ? b.y + 34 : zone === 'end' ? b.y + b.h - 36 : cy - 4;
      if (LANG === 'en') out.push(txt(cx, ly, T.area, 21, 600, SERIF, fg));
      else { out.push(txt(cx, ly - 6, T.area, 25, 600, SERIF, fg)); out.push(txt(cx, ly + 18, EN.types[m].area, 12.5, 500, SANS, fg, .74, 'sub')); }
    }
  } else {
    const [a, c] = MAPW.tri[m], fs = cmp ? 11 : 13;
    const ly = cmp ? b.y + 21 : zone === 'start' ? b.y + 30 : zone === 'end' ? b.y + b.h - 30 : cy;
    out.push(txt(cx, ly - (cmp ? 7 : 9), a, fs, 500, SANS, fg, .92, 'tri')); out.push(txt(cx, ly + (cmp ? 7 : 9), c, fs, 500, SANS, fg, .92, 'tri'));
  }
  return out.join('');
}
/* One builder for every map:
   res:   a person's own result (pin, spotlight, % on the four arms)
   crowd: dots for many people, from crowdLayout (+ crowdLabels)
   live:  cells react to pointer and keyboard (hit areas; see wireMap)
   dark:  lights start off, for the intro's light-up
   size:  fixed pixel size, for the saved image */
function buildMap(uid, opt = {}) {
  const res = opt.res || null, crowd = opt.crowd || null, live = !!opt.live, dark = !!opt.dark;
  const I = dark ? { L:0, G:0, N:0, P:0 } : FULL, size = crowd ? 'compact' : 'full';
  const p = [];
  const aria = MAPW.aria + (res ? `, ${MAPW.mine}: ${TYPES[res.place].name}` : '');
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 660 660"${opt.size ? ` width="${opt.size}" height="${opt.size}"` : ''} class="map${crowd ? ' crowd' : ''}" role="${live ? 'group' : 'img'}" aria-label="${escX(aria)}">`);
  p.push(`<defs>
    <clipPath id="${uid}-clip">${KEYS.map(k => rectS(ELRECT[k], `rx="${SQ_R}"`)).join('')}</clipPath>
    <filter id="${uid}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="${uid}-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
    <radialGradient id="${uid}-bloom"><stop offset="0" stop-color="#FFF8EE" stop-opacity=".5"/><stop offset=".5" stop-color="#FFF8EE" stop-opacity=".14"/><stop offset="1" stop-color="#FFF8EE" stop-opacity="0"/></radialGradient>
  </defs>`);
  p.push(`<g class="halo" filter="url(#${uid}-glow)" opacity="${res || crowd ? .2 : .5}">${EL.map(e => rectS(ELRECT[e.k], `rx="${SQ_R}" fill="${e.light}" class="halo-r" data-k="${e.k}" opacity="${dark ? 0 : 1}"`)).join('')}</g>`);
  p.push(`<g class="venn" style="isolation:isolate">`);
  p.push(`<rect x="-30" y="-30" width="660" height="660" fill="${NIGHT}" clip-path="url(#${uid}-clip)"/>`);   // the night the lights mix over, only inside the squares
  for (const e of EL) p.push(rectS(ELRECT[e.k], `rx="${SQ_R}" class="sq" data-k="${e.k}" fill="${sqFill(e, I)}" style="mix-blend-mode:screen"`));
  p.push(rectS(REG[15], `class="core-glow" fill="${coreFill(I)}" style="mix-blend-mode:screen"`));
  p.push(`</g>`);
  p.push(`<g clip-path="url(#${uid}-clip)"><circle class="bloom" cx="300" cy="300" r="150" fill="url(#${uid}-bloom)" opacity="${dark ? 0 : 1}"/></g>`);
  // each square keeps its own outline; where two squares share a side, the outlines sit side by side
  p.push(`<g class="edges" fill="none" stroke-width="2.25"${res || crowd ? ' opacity=".55"' : ''}>${EL.map(e => { const t = SQ_INSET[e.k], b = ELRECT[e.k];
    return `<rect class="edge" data-k="${e.k}" x="${b.x + t}" y="${b.y + t}" width="${b.w - 2 * t}" height="${b.h - 2 * t}" rx="${SQ_R - t}" stroke="${e.rim}" opacity="${dark ? 0 : .9}"/>`; }).join('')}</g>`);
  p.push(`<g class="labels${dark ? ' pre' : ''}"${crowd ? ' opacity=".9"' : ''}>`);
  for (const m of REG_ORDER) p.push(regionLabel(m, inkFor(regionRGB(m, FULL)), crowd ? 'start' : res && m === res.place ? res.zone : 'center', res ? res.s : null, size));
  p.push(`</g>`);
  if (res) {
    // spotlight: every other cell dims by how unlike this person it is
    const o = onness(res.s), f0 = res.place ? fit(res.place, o) : 0;
    p.push(`<g clip-path="url(#${uid}-clip)">`);
    for (const m of REG_ORDER) {
      if (m === res.place) continue;
      const ratio = f0 ? Math.min(1, fit(m, o) / f0) : 0;
      const v = Math.round((0.3 + 0.6 * (1 - Math.sqrt(ratio))) * 100) / 100;
      p.push(rectS(REG[m], `class="veil" fill="${NIGHT}" opacity="${live ? 0 : v}" data-v="${v}" shape-rendering="crispEdges"`));
    }
    p.push(`</g>`);
    const b = res.box;
    p.push(`<g class="${live ? 'spot' : ''}">
      <rect x="${b.x + 4}" y="${b.y + 4}" width="${b.w - 8}" height="${b.h - 8}" rx="12" fill="none" stroke="#FFF4E2" stroke-width="12" opacity=".3" filter="url(#${uid}-soft)"/>
      <rect x="${b.x + 4}" y="${b.y + 4}" width="${b.w - 8}" height="${b.h - 8}" rx="12" fill="none" stroke="#FFF4E2" stroke-width="2.5"${res.place === 0 ? ' stroke-dasharray="7 7"' : ''}/>
    </g>`);
    p.push(`<g transform="translate(${r1(res.x)} ${r1(res.y)})"><g class="pin-s"><g class="${live ? 'pin-in' : ''}">
      ${live ? `<circle class="pin-pulse" r="${PIN_R + 12}" fill="none" stroke="#FFF4E2" stroke-width="1.5"/>` : ''}
      <circle r="${PIN_R + 5}" fill="#FFF4E2" opacity=".18" filter="url(#${uid}-soft)"/>
      <circle r="${PIN_R}" fill="${NIGHT}" stroke="#FFF4E2" stroke-width="3"/>
      ${txt(0, 0.5, WORDS.me, LANG === 'en' ? 15 : 17, 700, SANS, '#FFF4E2')}
    </g></g></g>`);
  }
  if (crowd) {
    p.push(`<g class="dots">`);
    crowd.forEach((d, i) => {
      const focus = opt.focusable ? ` tabindex="0" role="button" aria-label="${escX(d.aria || d.label || '')}"` : '';
      p.push(`<g class="dot${d.fresh ? ' fresh' : ''}${d.me ? ' me' : ''}" data-i="${i}" data-m="${d.m}" transform="translate(${r1(d.x)} ${r1(d.y)})"${focus}>`);
      if (d.fresh || d.me || opt.focusable) p.push(`<circle class="ring" r="${r1(d.r + 6)}" fill="none" stroke="#FFF4E2" stroke-width="1.6"/>`);
      if (d.me) p.push(`<circle class="disc" r="${r1(d.r)}" fill="${NIGHT}" stroke="#FFF4E2" stroke-width="2.5"/>${txt(0, 0.5, WORDS.me, LANG === 'en' ? 10 : 11, 700, SANS, '#FFF4E2')}`);
      else p.push(`<circle class="disc" r="${r1(d.r)}" fill="#FFF4E2" stroke="${NIGHT}" stroke-width="2.5"/>`);
      if (d.lab) p.push(`<text x="${r1(d.lab.x)}" y="${r1(d.lab.y)}" text-anchor="${d.lab.a}" dominant-baseline="central" font-family="${SANS}" font-size="${d.lab.fs}" font-weight="600" fill="#FFF4E2" stroke="${NIGHT}" stroke-width="3.2" stroke-linejoin="round" paint-order="stroke">${escX(d.label)}</text>`);
      p.push(`</g>`);
    });
    p.push(`</g>`);
  }
  if (live) {
    p.push(`<rect class="insp" x="0" y="0" width="0" height="0" rx="12" fill="none" stroke="#FFF4E2" stroke-width="2" stroke-dasharray="6 6" opacity="0" pointer-events="none"/>`);
    p.push(`<g clip-path="url(#${uid}-clip)">`);
    for (const m of REG_ORDER) p.push(rectS(REG[m], `class="hit" data-m="${m}" tabindex="0" role="button" aria-label="${escX(`${TYPES[m].name}: ${members(m).map(e => e.name).join(', ')}`)}"`));
    p.push(`</g>`);
  }
  p.push('</svg>');
  return p.join('');
}
// cells answer pointer and keyboard; the picked cell gets a dashed outline unless it is the person's own
function wireMap(svg, onPick, mine) {
  const ring = svg.querySelector('.insp');
  const pick = m => {
    onPick(m);
    const b = REG[m];
    if (m !== mine) { ring.setAttribute('x', b.x + 4); ring.setAttribute('y', b.y + 4); ring.setAttribute('width', b.w - 8); ring.setAttribute('height', b.h - 8); ring.setAttribute('opacity', 1); }
    else ring.setAttribute('opacity', 0);
  };
  svg.querySelectorAll('.hit').forEach(h => {
    const m = +h.dataset.m;
    ['click', 'focus', 'mouseenter'].forEach(ev => h.addEventListener(ev, () => pick(m)));
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(m); } });
  });
  return pick;
}
// the intro: the four lights come on one after another
function setLights(svg, I) {
  svg.querySelectorAll('.sq').forEach(r => r.setAttribute('fill', sqFill(ELK[r.dataset.k], I)));
  svg.querySelector('.core-glow').setAttribute('fill', coreFill(I));
  svg.querySelectorAll('.halo-r').forEach(h => h.setAttribute('opacity', (I[h.dataset.k] / FULL[h.dataset.k]).toFixed(3)));
  svg.querySelectorAll('.edge').forEach(h => h.setAttribute('opacity', (0.9 * I[h.dataset.k] / FULL[h.dataset.k]).toFixed(3)));
  svg.querySelector('.bloom').setAttribute('opacity', lightLevel(I).toFixed(3));
}
function lightUp(svg) {
  const labels = svg.querySelector('.labels');
  if (reduceMotion) { setLights(svg, FULL); labels.classList.remove('pre'); return; }
  const order = KEYS, STEP = 340, DUR = 700, t0 = performance.now() + 250, e3 = t => 1 - Math.pow(1 - t, 3);
  const frame = now => {
    const I = {};
    order.forEach((k, i) => { I[k] = FULL[k] * e3(clamp((now - t0 - i * STEP) / DUR, 0, 1)); });
    setLights(svg, I);
    if (now - t0 < 3 * STEP + DUR) requestAnimationFrame(frame); else labels.classList.remove('pre');
  };
  requestAnimationFrame(frame);
}

root.Ikigai = {
  LANG, LANGS, OTHER_LANG, setLang, WORDS,
  NIGHT, TEXT, EL, ELK, KEYS, BIT, QUESTIONS, ORDER, SCALE, TYPES, SHAPE_ORDER, TIPS, RHO, NO_LIGHT, OFF_MAP,
  computeScores, shapeOf, coreOf, glowOf, glowWord, balance, analyze, analyzeScores, members, level, shapeLabel,
  mixLights, maskWeights, rgbCss, rgbHex, hexRgb, clamp, qt, qj, hasJong, pct, reduceMotion,
  REG, REG_ORDER, placeOf, locate, crowdLayout, crowdLabels, buildMap, wireMap, lightUp, setLights, regionRGB, inkFor, FULL,
};
})(window);

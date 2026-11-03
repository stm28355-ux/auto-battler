// ストーリーモードのシナリオ（spec §14）。ストーリーを開いたときだけ読み込む（src/ui/story.js が import() する）。
//
// events: 順に並べたイベント。
//   kind: 'main'（基軸。クリアで使えるコストが上がる）/ 'side'（駒・遺物が手に入る）/ 'ending'
//   requires: このイベントが出てくる条件（クリア済みのイベントのID）
//   before / win / lose: 会話。[話し手, 文] の並び。話し手は cast のキー（null はナレーション）
//   battle: { opponent: battlers のキー }。ないイベントは会話だけ
//   reward: { costRatio, pieces, relics }（クリアしたときに手に入る）
// 対戦相手のチームは、そのイベントで主人公が使えるコスト（costRatio × ボードの上限）を基準に、
//   弱い ≒ 7割、普通 ≒ 9割、強い = 10割（まだ手に入らない駒も使う）で組む。

const T = (name, board, cells, relics = []) => ({
  name,
  board,
  slots: Object.entries(cells).map(([k, pieceId]) => ({ pos: k.split(',').map(Number), pieceId })),
  relics,
});

export const STRENGTH = { weak: '弱い', normal: '普通', strong: '強い' };

// 登場人物。icon は今は絵文字（見た目の差し替え #18 で絵にする）
export const CAST = {
  ares: { name: 'アレス', icon: '🧑' },
  thor: { name: 'トール', icon: '😄' },
  thorChamp: { name: 'トール', icon: '👑' },
  glen: { name: 'グレン', icon: '✨' },
  glenBattle: { name: 'グレン', icon: '😠', note: 'バトル中' },
  mule: { name: 'ミュレ', icon: '🧪' },
  machina: { name: 'マキナ', icon: '🦾' },
  teacher: { name: '先生', icon: '🧑‍🏫' },
  mc: { name: '実況', icon: '🎙️' },
  gald: { name: 'ガルド', icon: '🥋' },
  popo: { name: 'ポポ', icon: '🛒' },
  rin: { name: 'リン', icon: '🐾' },
  sera: { name: 'セラ', icon: '🔮' },
  bolt: { name: 'ボルト', icon: '🔧' },
  zain: { name: 'ザイン', icon: '🧳' },
  shiori: { name: 'シオリ', icon: '📚' },
  van: { name: 'ヴァン', icon: '👴' },
};

// 対戦相手。team はストーリー中のチーム、rematch はクリア後の「本気」のチーム（なければ team と同じ）。
// noRematch: クリア後の再戦一覧に出さない（正体を隠していたときのトールなど）
export const BATTLERS = {
  thor: {
    name: 'トール', title: '同級生', icon: '😄', tribe: 'warrior', strength: 'weak', noRematch: true,
    team: T('トールの戦士たち', 'square', { '1,1': 'c_knight', '1,2': 'i_shield', '2,1': 'c_squire', '2,2': 'i_sword', '3,1': 'c_squire', '3,2': 'c_squire' }),
  },
  glen: {
    name: 'グレン', title: '学級委員長', icon: '😠', tribe: 'beast', strength: 'weak',
    team: T('グレンの獣の群れ', 'honeycomb', { '1,2': 'c_wolf', '1,4': 'c_hawk', '2,1': 'c_boar', '2,3': 'i_banner', '2,5': 'c_viper', '3,2': 'c_leopard', '3,4': 'c_wolf' }, ['r_totem']),
    rematch: T('グレンの野生火力', 'honeycomb', { '1,2': 'c_lion', '1,4': 'c_lion', '2,1': 'c_behemoth', '2,3': 'i_blade', '2,5': 'c_leopard', '3,2': 'c_leopard', '3,4': 'c_lion' }, ['r_totem', 'r_whetstone', 'r_hourglass']),
  },
  mule: {
    name: 'ミュレ', title: '科学部部長', icon: '🧪', tribe: 'mage', strength: 'normal',
    team: T('ミュレの毒実験', 'pentagram', { '2,1': 'c_knight', '2,2': 'c_apprentice', '2,3': 'c_hexer', '2,4': 'c_apprentice', '3,1': 'c_cursemaster', '3,2': 'c_apprentice', '3,3': 'c_witch' }, ['r_hourglass', 'r_spring']),
    rematch: T('ミュレの毒魔術', 'pentagram', { '4,3': 'i_vial', '2,1': 'c_knight', '2,2': 'c_apprentice', '2,3': 'c_hexer', '2,4': 'c_apprentice', '2,5': 'c_witch', '3,1': 'c_knight', '3,2': 'c_apprentice', '3,3': 'c_hexer', '3,4': 'c_apprentice' }, ['r_hourglass', 'r_spring', 'r_amulet']),
  },
  machina: {
    name: 'マキナ', title: '前年優勝者', icon: '🦾', tribe: 'machine', strength: 'normal',
    team: T('マキナの機械兵団', 'square', { '1,1': 'c_golem', '2,1': 'c_tesla', '3,1': 'c_reactor', '1,2': 'c_medibot', '2,2': 'i_gear', '3,2': 'c_drone', '1,3': 'c_turret', '2,3': 'c_drone', '3,3': 'c_drone' }, ['r_gearheart', 'r_thunder']),
    rematch: T('マキナの機械工廠', 'square', { '1,1': 'c_golem', '2,1': 'c_tesla', '3,1': 'c_golem', '1,2': 'c_medibot', '2,2': 'i_gear', '3,2': 'c_drone', '1,3': 'c_turret', '2,3': 'c_fighter', '3,3': 'c_drone' }, ['r_gearheart', 'r_thunder', 'r_spring']),
  },
  thorChamp: {
    name: 'トール', title: '校内チャンピオン', icon: '👑', tribe: 'warrior', strength: 'strong',
    team: T('チャンピオンの王国', 'honeycomb', { '1,2': 'c_guard', '2,1': 'c_paladin', '3,2': 'c_knight', '2,3': 'c_general', '1,4': 'c_swordmaster', '2,5': 'c_squire', '3,4': 'c_squire' }, ['r_amulet', 'r_warhorn']),
  },
  gald: {
    name: 'ガルド', title: '剣術部主将', icon: '🥋', tribe: 'warrior', strength: 'weak',
    team: T('剣術部', 'square', { '1,1': 'c_knight', '2,1': 'c_berserker', '3,1': 'c_squire', '2,2': 'i_sword', '1,2': 'c_squire' }, ['r_warhorn']),
  },
  popo: {
    name: 'ポポ', title: '購買部の看板娘', icon: '🛒', tribe: 'neutral', strength: 'weak',
    team: T('購買部の品ぞろえ', 'honeycomb', { '1,2': 'c_knight', '2,1': 'c_squire', '2,3': 'i_potion', '3,2': 'c_drone', '1,4': 'c_elf', '2,5': 'c_wolf', '3,4': 'c_apprentice' }, ['r_amulet']),
  },
  rin: {
    name: 'リン', title: '飼育委員', icon: '🐾', tribe: 'beast', strength: 'weak',
    team: T('飼育小屋の仲間たち', 'honeycomb', { '1,2': 'c_bear', '2,1': 'c_boar', '3,2': 'c_leopard', '2,3': 'i_banner', '1,4': 'c_lion', '2,5': 'c_wolf', '3,4': 'c_hawk' }, ['r_totem']),
  },
  sera: {
    name: 'セラ', title: '魔術研究会 会長', icon: '🔮', tribe: 'mage', strength: 'weak',
    team: T('魔術研究会', 'pentagram', { '2,1': 'c_knight', '2,2': 'c_oracle', '2,3': 'c_witch', '3,1': 'c_cursemaster', '3,2': 'c_apprentice', '3,3': 'c_apprentice' }, ['r_grimoire']),
  },
  bolt: {
    name: 'ボルト', title: 'ロボット研究会 部長', icon: '🔧', tribe: 'machine', strength: 'weak',
    team: T('ロボ研の試作機', 'square', { '1,1': 'c_golem', '2,1': 'c_reactor', '3,1': 'c_tesla', '1,2': 'c_medibot', '2,2': 'i_gear', '3,2': 'c_drone', '2,3': 'c_drone' }, ['r_gearheart']),
  },
  zain: {
    name: 'ザイン', title: '留学生', icon: '🧳', tribe: 'neutral', strength: 'weak',
    team: T('異国のバトラー', 'honeycomb', { '1,2': 'c_dwarf', '2,1': 'c_squire', '3,2': 'c_boar', '2,3': 'i_sword', '1,4': 'c_vampire', '2,5': 'c_hawk', '3,4': 'c_wolf' }, ['r_lone']),
  },
  shiori: {
    name: 'シオリ', title: '図書委員', icon: '📚', tribe: 'mage', strength: 'weak',
    team: T('禁書の大魔術', 'pentagram', { '1,3': 'i_doll', '2,1': 'c_knight', '2,2': 'c_pyromancer', '3,1': 'c_squire', '3,2': 'c_sorcerer' }, ['r_grimoire']),
  },
  van: {
    name: 'ヴァン', title: '宝物庫番の老教師', icon: '👴', tribe: 'beast', strength: 'normal',
    team: T('宝物庫の守り手', 'honeycomb', { '1,2': 'c_lion', '1,4': 'c_hawk', '2,1': 'c_bear', '2,3': 'i_blade', '2,5': 'c_leopard', '3,2': 'c_boar', '3,4': 'c_wolf' }, ['r_totem']),
  },
};

export const STORY = {
  // 最初から使えるもの
  start: {
    costRatio: 0.5,
    pieces: ['c_squire', 'c_knight', 'c_apprentice', 'c_wolf', 'c_hawk', 'c_drone', 'c_elf', 'i_sword', 'i_shield', 'i_potion'],
    relics: ['r_whetstone'],
  },
  events: [
    // ---- 第1章 入学 ----
    {
      id: 'm0_enroll', kind: 'main', chapter: 1, title: '入学', summary: 'バトラー養成学校の門をくぐる',
      before: [
        [null, 'オートバトラー――駒を盤面に並べ、あとは見守るだけの戦い。この世界で、それを知らない者はいない。'],
        [null, '名門「王立バトラー養成学校」。今年も、プロを夢見る新入生たちが門をくぐる。'],
        ['ares', 'ここが養成学校……！ 目指すは校内チャンピオンだ！'],
        ['teacher', '新入生の諸君、入学おめでとう。さっそくだが、自己紹介の代わりに、隣の席の者と一戦交えてもらう。'],
        ['ares', 'いきなり対戦!?'],
        ['thor', 'よろしくな！ オレはトール。戦士の駒が好きなんだ。お手柔らかに頼むぜ。'],
        [null, '（ストーリー用の編成は、通常の編成とは別です。最初は使えるコストと駒が少なく、物語を進めると増えていきます）'],
      ],
    },
    {
      id: 'm1_intro', kind: 'main', chapter: 1, title: '自己紹介', summary: '隣の席のトールと対戦', requires: ['m0_enroll'],
      battle: { opponent: 'thor' },
      reward: { costRatio: 0.6 },
      before: [
        ['thor', '戦士はいいぞ。堅くて、まっすぐで、裏切らない。'],
        ['ares', '編成はできてる。コストはまだ少ないけど……やるしかない！'],
        ['teacher', '前線の防御と、攻撃がどれだけ通るかをよく見ておけ。始め！'],
      ],
      win: [
        ['thor', 'っはー、負けた負けた！ やるじゃないか、アレス。'],
        ['thor', '……うん、面白い。お前、もっと強くなりそうだな。'],
        ['teacher', '勝者、アレス。今日の結果に応じて、使える駒のコスト枠を広げてやろう。'],
        ['ares', '（部活や購買部をのぞけば、新しい駒も手に入りそうだ）'],
      ],
      lose: [
        ['thor', 'へへっ、戦士は堅いだろ？ 編成を見直して、またやろうぜ。'],
      ],
    },
    // ---- 第2章 出場枠 ----
    {
      id: 'm2_rep', kind: 'main', chapter: 2, title: '出場枠をかけて', summary: '学級委員長グレンと、校内戦の出場枠をかけて対戦', requires: ['m1_intro'],
      battle: { opponent: 'glen' },
      reward: { costRatio: 0.75 },
      before: [
        [null, '校内戦――優勝した者だけが、校内チャンピオンへの挑戦権を得る。ただし、出場枠はクラスに一つ。'],
        ['glen', 'やあ、アレス君。僕は学級委員長のグレン。クラスの代表は、僕が務めるつもりなんだ。'],
        ['glen', 'もちろん、正々堂々と決めよう。君の健闘を祈っているよ。'],
        ['ares', '（すごく爽やかな人だ……）'],
        [null, '盤面に駒が並んだ瞬間、グレンの目つきが変わった。'],
        ['glenBattle', '……あ？ 何ボサッとしてんだ。さっさと並べろ。'],
        ['glenBattle', 'オレの獣どもは腹ペコでな。食い散らかされても文句言うんじゃねえぞ！'],
        ['ares', '（さっきと別人だ!?）'],
      ],
      win: [
        ['glenBattle', 'チッ……オレの群れが、押し負けただと……？'],
        ['glen', '……ふう。失礼、取り乱したね。代表は君だ、アレス君。クラスの誇りを頼んだよ。'],
        ['ares', '（戻った……）'],
      ],
      lose: [
        ['glenBattle', 'ハッ、その程度かよ！ 出直してきな！'],
        ['glen', '……おっと。いつでも挑戦を受けるよ、アレス君。'],
      ],
    },
    // ---- 第3章 校内戦 ----
    {
      id: 'm3_lab', kind: 'main', chapter: 3, title: '校内戦・一回戦', summary: '科学部部長ミュレと対戦（毒に注意）', requires: ['m2_rep'],
      battle: { opponent: 'mule' },
      reward: { costRatio: 0.9 },
      before: [
        ['mc', 'さあ始まりました校内戦！ 一回戦は、新入生アレスと――科学部部長、ミュレ！'],
        ['mule', 'ふふ……ようこそ、私の実験台さん。'],
        ['mule', '毒はね、防御なんて関係ないの。じわじわ、じわじわ……数字が減っていくのを見るのが好きなのよ。'],
        ['ares', '（毒は時間がたつほど効いてくる。長引かせたらまずい……！）'],
      ],
      win: [
        ['mule', 'あら……毒が回りきる前に、倒されちゃった。'],
        ['mule', 'いいデータが取れたわ。次の実験にも、付き合ってもらおうかしら。'],
        ['mc', '勝者アレス！ 新入生が決勝へ駒を進めたァ！'],
      ],
      lose: [
        ['mule', 'ふふ、実験成功。防御を固めても、毒は止まらないわよ？'],
      ],
    },
    {
      id: 'm4_final', kind: 'main', chapter: 3, title: '校内戦・決勝', summary: '前年優勝者マキナと対戦（回復と麻痺の長期戦）', requires: ['m3_lab'],
      battle: { opponent: 'machina' },
      reward: { costRatio: 1 },
      before: [
        ['mc', '決勝戦！ 相手は昨年の優勝者、マキナ！'],
        [null, '去年の優勝のあと、彼女は全身を改造し、バトルサイボーグになったという。'],
        ['machina', '対戦相手、アレス。データ照合……脅威度、低。'],
        ['machina', '私は止まらない。修復し、麻痺させ、最後まで立っている。それが機械の勝ち方。'],
        ['ares', '長期戦は向こうの土俵か……でも、ここで負けるわけにはいかない！'],
      ],
      win: [
        ['machina', '……損傷、限界。計算に、ない……結果。'],
        ['machina', 'アレス。あなたの名前を、記録した。……チャンピオンに、届くといい。'],
        ['mc', '校内戦優勝は、新入生アレスだァー！！'],
      ],
      lose: [
        ['machina', '予測どおり。修理が終わったら、また来るといい。'],
      ],
    },
    // ---- 第4章 チャンピオンマッチ ----
    {
      id: 'm5_champion', kind: 'main', chapter: 4, title: 'チャンピオンマッチ', summary: '校内チャンピオンに挑む', requires: ['m4_final'],
      battle: { opponent: 'thorChamp' },
      before: [
        ['mc', 'いよいよチャンピオンマッチ！ 挑戦者アレスの前に現れるのは――現・校内チャンピオン！'],
        ['ares', '……え？ トール!?'],
        ['thorChamp', 'よう、アレス。待ってたぜ。'],
        ['thorChamp', '入学式の日、新入生のふりをして紛れ込んでたんだ。強い奴を探すためにな。'],
        ['thorChamp', 'お前と最初に戦ったとき、確信したよ。こいつは、ここまで来るって。'],
        ['thorChamp', 'あの日の戦士たちは、ほんの小手調べだ。――今日は、本気でいく。'],
        ['ares', '望むところだ！'],
      ],
      win: [
        ['thorChamp', '……ははっ。負けたよ。完敗だ。'],
        ['thorChamp', '探した甲斐があった。今日からお前が、チャンピオンだ。'],
        ['ares', 'トール……ありがとう。あの日、戦ってくれて。'],
      ],
      lose: [
        ['thorChamp', 'どうした、アレス。お前はこんなもんじゃないだろ？ 何度でも来い！'],
      ],
    },
    {
      id: 'ending', kind: 'ending', chapter: 5, title: '卒業', summary: 'エンディング', requires: ['m5_champion'],
      before: [
        [null, 'こうしてアレスは、養成学校の新たなチャンピオンとなった。'],
        [null, '季節はめぐり――卒業の日。'],
        ['glen', 'おめでとう、アレス君。'],
        ['glenBattle', '……次に会うときはプロの舞台だ。そのときは容赦しねえからな。'],
        ['mule', '卒業しても、実験台はやめさせないわよ？'],
        ['machina', '次は、勝つ。記録を、更新する。'],
        ['thor', 'プロの世界は広いぞ。もっと強い奴が、山ほどいる。'],
        ['ares', 'ああ。だから行くんだ。――オレのオートバトルは、ここからだ！'],
        [null, 'バトラー・アレスの活躍は、また別のお話。 ― END ―'],
        [null, '（クリアおめでとうございます。これからは、すべての駒・遺物とコスト100%で遊べます。学園のバトラーたちとも、いつでも再戦できます）'],
      ],
    },

    // ---- サイドイベント（駒・遺物が手に入る）----
    {
      id: 's1_kendo', kind: 'side', title: '剣術部の入部試験', summary: '戦士の駒が手に入る', requires: ['m1_intro'],
      battle: { opponent: 'gald' },
      reward: { pieces: ['c_berserker', 'c_paladin', 'c_swordmaster'], relics: ['r_warhorn'] },
      before: [
        ['gald', '新入生！ 剣術部に入らんか！ 入部試験は、もちろんオートバトルだ！'],
      ],
      win: [
        ['gald', '見事！ 部の秘蔵の駒を持っていけ！'],
      ],
      lose: [['gald', 'まだまだ！ 鍛え直してこい！']],
    },
    {
      id: 's2_shop', kind: 'side', title: '購買部の看板娘', summary: '道具が手に入る', requires: ['m1_intro'],
      battle: { opponent: 'popo' },
      reward: { pieces: ['i_spear', 'i_gear', 'i_banner', 'i_drum', 'i_ward'], relics: ['r_amulet'] },
      before: [
        ['popo', 'いらっしゃいませー！ 購買部のポポです！ ちょうど対戦相手を探してたんです！'],
        ['popo', '勝ったら、道具をお安く……いえ、タダでお譲りしますよ！'],
      ],
      win: [
        ['popo', '負けちゃいましたー。約束どおり、道具をどうぞ！ 遺物もおまけしちゃいます！'],
      ],
      lose: [['popo', 'まいどありー！ ……あ、対戦のお代はいただきませんよ？']],
    },
    {
      id: 's3_zoo', kind: 'side', title: '飼育小屋の仲間たち', summary: '獣の駒が手に入る', requires: ['m2_rep'],
      battle: { opponent: 'rin' },
      reward: { pieces: ['c_viper', 'c_leopard', 'c_boar', 'c_bear', 'c_lion'], relics: ['r_totem'] },
      before: [
        ['rin', 'しーっ。動物たちが起きちゃう。……あ、委員長に勝った人？ あの人、バトルのときだけ怖いよね。'],
        ['rin', 'この子たち、運動不足なの。ちょっと遊んであげて？'],
      ],
      win: [
        ['rin', 'いい運動になったって。何匹か、あなたについて行きたいみたい。'],
      ],
      lose: [['rin', 'みんな元気いっぱい。また遊びに来てね。']],
    },
    {
      id: 's4_magic', kind: 'side', title: '魔術研究会', summary: '魔導の駒が手に入る', requires: ['m2_rep'],
      battle: { opponent: 'sera' },
      reward: { pieces: ['c_hexer', 'c_witch', 'c_oracle', 'c_cursemaster', 'i_vial'], relics: ['r_grimoire'] },
      before: [
        ['sera', '魔術研究会へようこそ。毒だけが魔導じゃないってこと、見せてあげる。'],
      ],
      win: [
        ['sera', '……合格。うちの研究成果、使ってみて。呪いは、味方の攻撃をまとめて通しやすくするの。'],
      ],
      lose: [['sera', '研究が足りないわね。']],
    },
    {
      id: 's5_robot', kind: 'side', title: 'ロボット研究会', summary: '機械の駒が手に入る', requires: ['m3_lab'],
      battle: { opponent: 'bolt' },
      reward: { pieces: ['c_medibot', 'c_reactor', 'c_tesla', 'c_turret', 'c_golem', 'i_stungun'], relics: ['r_gearheart', 'r_thunder'] },
      before: [
        ['bolt', 'おう、校内戦で暴れてる新入生だな！ マキナ先輩とやるなら、まず機械を知っとけ！'],
      ],
      win: [
        ['bolt', 'やるなあ！ 試作機、持ってけ！ 決勝、応援してるぜ！'],
      ],
      lose: [['bolt', '機械は止まらねえぞ！ 対策してまた来な！']],
    },
    {
      id: 's6_exchange', kind: 'side', title: '異国のバトラー', summary: '中立の駒が手に入る', requires: ['m3_lab'],
      battle: { opponent: 'zain' },
      reward: { pieces: ['c_dwarf', 'c_vampire', 'c_dragonkin'], relics: ['r_lone', 'r_heart'] },
      before: [
        ['zain', 'この国のバトラーは、種族をそろえたがる。……一体でも強い駒がいることを、教えてやろう。'],
      ],
      win: [
        ['zain', 'なるほど。私の仲間を、あなたに紹介しておこう。中立の駒は、少ないほど力を出す。'],
      ],
      lose: [['zain', '数より質。覚えておくといい。']],
    },
    {
      id: 's7_library', kind: 'side', title: '図書室の禁書', summary: '大魔術の駒と、毒・呪いの道具が手に入る', requires: ['m3_lab'],
      battle: { opponent: 'shiori' },
      reward: { pieces: ['c_sorcerer', 'c_pyromancer', 'c_archmage', 'i_censer', 'i_doll'], relics: ['r_antidote', 'r_hourglass'] },
      before: [
        ['shiori', '図書室では、お静かに。……対戦なら、静かにできます。大魔術は、一撃が重いので。'],
      ],
      win: [
        ['shiori', '返却期限は、ありません。どうぞ、使ってください。'],
      ],
      lose: [['shiori', '……お静かに。']],
    },
    {
      id: 's8_vault', kind: 'side', title: '宝物庫の鍵', summary: '強力な駒・道具・遺物が手に入る', requires: ['m4_final'],
      battle: { opponent: 'van' },
      reward: {
        pieces: ['c_guard', 'c_dragoon', 'c_general', 'c_behemoth', 'c_fighter', 'c_workshop', 'c_fiend', 'i_blade', 'i_armor', 'i_crown'],
        relics: ['r_spring', 'r_phalanx'],
      },
      before: [
        ['van', '決勝を勝ち抜いたか。チャンピオンに挑む前に、宝物庫の鍵を開けてやろう。'],
        ['van', 'ただし――わしに勝てたらの話じゃがな。'],
      ],
      win: [
        ['van', 'ほっほ。持っていけ。チャンピオンは、手加減を知らん相手じゃぞ。'],
      ],
      lose: [['van', 'ほっほ、まだまだ青いのう。']],
    },
  ],
};

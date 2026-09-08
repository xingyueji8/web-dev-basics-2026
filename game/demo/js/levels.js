/* 关卡注册表（to-do #10）。
 * 只放"跨关卡"的设计信息：顺序、页面文件、标题、敌方 AI 策略等。
 * 每关的棋盘/回合/棋子配置仍保留在各自 gameN.js（方便不同人分别维护自己的关）。
 * ai 为 null / 缺省 => 站桩（第 1、2 关设计如此）。
 */

var LEVELS_ORDER = [
	{
		id: 1, file: 'game1.html', name: '第 1 关 · 破晓防线', ai: null,
		chapter: '第一幕 · 鹰旗初升', location: '乌尔姆近郊 · 1805', scene: 'dawn',
		hint: '选中己方步兵，再点击空地即可下达持续移动命令。中路守军不会主动移动；先分散接近，再逐个突破。',
		story: [
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '看见山脊上的火光了吗？敌军以为守住中央，就能拦住整支大军。' },
			{ who: '副官', role: '帝国参谋部', side: 'right', portrait: 'img/portraits/adjutant.png', text: '他们已经下令死守，陛下。一步也不准备后退。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '不肯移动的防线，只是一扇等着被推开的门。让步兵从两翼靠近，今天由我们写下第一行战报。' }
		]
	},
	{
		id: 2, file: 'game2.html', name: '第 2 关 · 炮火走廊', ai: null,
		chapter: '第二幕 · 雷霆之声', location: '耶拿前线 · 1806', scene: 'battery',
		hint: '炮兵射程远、伤害高，但移动缓慢。用步兵掩护己方火炮，同时避开敌方右翼火炮四格以内的射界。',
		story: [
			{ who: '副官', role: '帝国参谋部', side: 'right', portrait: 'img/portraits/adjutant.png', text: '陛下，雨后的道路陷住了弹药车。我们的炮兵还没来得及展开，敌军已经逼近。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '一门摆正位置的火炮，胜过一整排仓促冲锋的步兵。' },
			{ who: '副官', role: '帝国参谋部', side: 'right', portrait: 'img/portraits/adjutant.png', text: '那么步兵的任务，是替炮兵争取时间？' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '正是。守住雷霆，雷霆自然会替我们打开道路。' }
		]
	},
	{
		id: 3, file: 'game3.html', name: '第 3 关 · 雪原突骑', ai: { strategy: 'breakthrough' },
		chapter: '第三幕 · 风雪疾驰', location: '东普鲁士 · 1807', scene: 'snow',
		hint: '骑兵速度快、攻击高，却不适合被围攻。敌军会追击最近的目标；保持部队相互策应，用骑兵撕开缺口后及时脱离。',
		story: [
			{ who: '传令兵', role: '近卫骑兵通讯队', side: 'right', portrait: 'img/portraits/courier.png', text: '陛下！风雪遮住了敌军的旗号，但他们的右翼正在重新集结。缺口只会维持片刻。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '片刻已经足够。骑兵需要的从来不是一条大道，只是一道缝隙。' },
			{ who: '传令兵', role: '近卫骑兵通讯队', side: 'right', portrait: 'img/portraits/courier.png', text: '我这就把命令送到前线。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '告诉他们：冲进去，但不要停在那里。速度既是长矛，也是盾牌。' }
		]
	},
	{
		id: 4, file: 'game4.html', name: '第 4 关 · 血肉方阵', ai: { strategy: 'cluster', core: 0 },
		chapter: '第四幕 · 方阵如墙', location: '多瑙河畔 · 1809', scene: 'river',
		hint: '掷弹兵生命高，适合承担前排压力；散兵可在外围射击。敌军会围绕中央核心抱团，不要正面挤入，用远程单位从外圈消耗。',
		story: [
			{ who: '联军司令', role: '联军战地指挥部', side: 'right', portrait: 'img/portraits/coalition-commander.png', text: '以中央掷弹兵为轴，收紧队列。法国人若想靠近，就必须撞上整座方阵。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '他把士兵叠成了一堵墙，也把他们困进了同一个口袋。' },
			{ who: '副官', role: '帝国参谋部', side: 'right', portrait: 'img/portraits/adjutant.png', text: '散兵已经绕到外圈，掷弹兵等候您的命令。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '用最坚固的人钉住它，再让子弹一层层剥开它。墙不必推倒，也可以被拆掉。' }
		]
	},
	{
		id: 5, file: 'game5.html', name: '第 5 关 · 铁血强攻', ai: { strategy: 'breakthrough', threat: 'strongest' },
		chapter: '第五幕 · 漫长东征', location: '斯摩棱斯克以西 · 1812', scene: 'embers',
		hint: '本关兵种齐全。敌军会优先集火攻击力最高的单位；炮兵和骑兵尤其危险，应让步兵、掷弹兵挡住接近路线。',
		story: [
			{ who: '传令兵', role: '近卫骑兵通讯队', side: 'right', portrait: 'img/portraits/courier.png', text: '陛下，敌军没有扑向中央。他们在追逐我们的骑兵和炮兵，像是早已看穿了火力部署。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '他们看见了最锋利的剑，却忘了剑也有护手。' },
			{ who: '副官', role: '帝国参谋部', side: 'right', portrait: 'img/portraits/adjutant.png', text: '我会命令步兵收拢，在高攻部队前建立屏障。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '很好。让他们为每一步接近付出代价，然后用我们保存下来的火力结束战斗。' }
		]
	},
	{
		id: 6, file: 'game6.html', name: '第 6 关 · 决战前夜', ai: { strategy: 'breakthrough', threat: 'weakest' },
		chapter: '第六幕 · 雨云之下', location: '滑铁卢南方 · 1815', scene: 'storm',
		hint: '敌军会优先攻击生命最低的单位。让残血部队撤到阵型后方，由状态完整的部队接替前线；保留每一支可战力量。',
		story: [
			{ who: '联军司令', role: '联军战地指挥部', side: 'right', portrait: 'img/portraits/coalition-commander.png', text: '雨会拖慢所有人。找到法国阵线中最虚弱的一点，持续施压，直到它断裂。' },
			{ who: '副官', role: '帝国参谋部', side: 'right', portrait: 'img/portraits/adjutant.png', text: '陛下，斥候判断敌军在搜寻我们的伤兵。他们会追着最弱的部队不放。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '那就别给他一个固定的伤口。伤兵后撤，预备队补位，让整条阵线像活的一样呼吸。' },
			{ who: '副官', role: '帝国参谋部', side: 'right', portrait: 'img/portraits/adjutant.png', text: '天亮后，一切都会在这里决定。' },
			{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '不，是从现在的每一道命令开始决定。' }
		]
	}
];

function getLevelList() { return LEVELS_ORDER; }

/* 隐藏关卡（to-do #14）：不进主菜单的常规列表；game1 在 12 回合内通关后开启，
 * game6 通关后 Next Game 进入它，game7 通关后进入隐藏结局页。 */
var HIDDEN_LEVEL = {
	id: 7,
	file: 'game7.html',
	name: '第 7 关 · 帝国黄昏（隐藏）',
	ai: { strategy: 'cluster', core: 0 },
	chapter: '终幕 · 未写之史', location: '另一条时间线 · 1815', scene: 'twilight',
	hint: '敌军旧卫队会围绕核心结成紧密阵线。不要平均消耗兵力；集中撕开核心，才能让整支部队失去依托并改写终局。',
	story: [
		{ who: '传令兵', role: '近卫骑兵通讯队', side: 'right', portrait: 'img/portraits/courier.png', text: '陛下……地图上的道路变了。我们越过了史书最后标出的界线，却又看见了滑铁卢。' },
		{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '历史只是胜利者装订成册的战报。既然来到空白的一页，我们就亲自落笔。' },
		{ who: '联军司令', role: '最后的联军防线', side: 'right', portrait: 'img/portraits/coalition-commander.png', text: '旧卫队会守住核心。无论你从哪一页归来，这里都将是帝国的终点。' },
		{ who: '拿破仑', role: '法兰西皇帝', side: 'left', portrait: 'img/portraits/napoleon.png', text: '终点？不。今天，我们只把它称作黄昏——因为黄昏之后，仍可能有新的黎明。' }
	]
};
function getHiddenLevel() { return HIDDEN_LEVEL; }

function getLevelById(id) {
	const all = LEVELS_ORDER.concat([HIDDEN_LEVEL]);
	return all.find(l => Number(l.id) === Number(id)) || null;
}

function getLevelIndex(id) {
	return LEVELS_ORDER.findIndex(l => Number(l.id) === Number(id));
}

/* Next Game 的目标：注册表里下一关；已到最后一关则进 end-game.html */
function nextLevelFile(id) {
	const i = getLevelIndex(id);
	if (i < 0) return './end-game.html';
	const nxt = LEVELS_ORDER[i + 1];
	return nxt ? nxt.file : './end-game.html';
}

/* 把某关在注册表里的 AI 策略挂到 CURRENT_GAME.ai（无则置 null = 站桩） */
function attachLevelAI(id) {
	if (typeof CURRENT_GAME === 'undefined' || !CURRENT_GAME) return;
	const meta = getLevelById(id);
	CURRENT_GAME.ai = (meta && meta.ai) ? meta.ai : null;
}

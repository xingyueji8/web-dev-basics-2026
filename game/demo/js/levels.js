/* 战役注册表：保存跨关卡的标题、史实剧情、提示与敌方 AI。
 * 棋盘、回合与棋子仍由各 gameN.js 维护。日期、地点和战役结果以史实为骨架；
 * 人物对白是游戏化演绎，并非史料原话。
 */

function localizedText(zhCN, en) {
	return { 'zh-CN': zhCN, en: en };
}

function campaignLine(who, role, side, portrait, zhCN, en, action) {
	var line = { who: who, role: role, side: side, portrait: portrait, text: localizedText(zhCN, en) };
	if (action) line.action = action;
	return line;
}

var NAPOLEON = 'img/portraits/napoleon.webp';
var ADJUTANT = 'img/portraits/adjutant.webp';
var COURIER = 'img/portraits/courier.webp';
var COALITION = 'img/portraits/coalition-commander.webp';

/* 登录成功后的视觉小说序章：1793 年土伦是这条人物成长线的起点。 */
var CAMPAIGN_PROLOGUE = {
	chapter: localizedText('序章 · 鹰旗尚未升起', 'Prologue · Before the Eagle Rose'),
	location: localizedText('土伦围城战 · 1793年秋', 'Siege of Toulon · Autumn 1793'),
	scene: 'battery',
	story: [
		campaignLine(localizedText('国民公会专员', 'Representative on Mission'), localizedText('共和军围城司令部', 'Republican Siege Headquarters'), 'right', COALITION,
			'保王党把土伦港和地中海舰队交给了英、西联军。城墙、海面舰炮、外围堡垒——我们已经在这里停了太久。',
			'Royalists have handed Toulon and the Mediterranean fleet to the Anglo-Spanish coalition. Walls, naval guns, outer forts—we have been stalled here too long.', 'challenge'),
		campaignLine(localizedText('让・安多歇・朱诺', 'Jean-Andoche Junot'), localizedText('共和军志愿兵', 'Republican Volunteer'), 'right', COURIER,
			'港内舰船彼此掩护，穆尔格雷夫堡又封住了通往埃吉莱特高地的道路。士兵们把它叫作“小直布罗陀”。',
			'Coalition ships cover one another, while Fort Mulgrave blocks the road to l’Eguillette. The men call it “Little Gibraltar.”', 'report'),
		campaignLine('拿破仑', localizedText('二十四岁的炮兵军官', 'Twenty-four-year-old Artillery Officer'), 'left', NAPOLEON,
			'城市不是钥匙，港口才是。夺下穆尔格雷夫，再把火炮推上埃吉莱特；只要炮口控制内外锚地，联军舰队就必须撤走。',
			'The city is not the key—the harbor is. Take Mulgrave, move the guns onto l’Eguillette, and once our batteries command both anchorages, the coalition fleet must withdraw.', 'resolve'),
		campaignLine('联军司令', localizedText('土伦联军防务司令部', 'Coalition Command at Toulon'), 'right', COALITION,
			'法国人会继续撞击城墙。他们没有足够的火炮，更没有人能在乱局里看清整座港湾。',
			'The French will keep battering the walls. They lack the guns—and the officer—to see the whole harbor through this confusion.', 'challenge'),
		campaignLine('拿破仑', localizedText('临时炮兵指挥官', 'Acting Artillery Commander'), 'left', NAPOLEON,
			'那就让他们继续盯着城墙。朱诺，记下命令：集中炮兵、切断堡垒间的联络，入夜后由步兵从两翼逼近。',
			'Then let them keep watching the walls. Junot, take this down: mass the guns, sever the forts from one another, and send infantry in from both flanks after dark.', 'command'),
		campaignLine(localizedText('让・安多歇・朱诺', 'Jean-Andoche Junot'), localizedText('共和军志愿兵', 'Republican Volunteer'), 'right', COURIER,
			'命令已记下。可是长官，如果判断错了呢？', 'The order is written. But Commander—what if your judgment is wrong?', 'report'),
		campaignLine('拿破仑', localizedText('临时炮兵指挥官', 'Acting Artillery Commander'), 'left', NAPOLEON,
			'那么历史不会记住我们。如果判断正确，天亮时，欧洲会第一次听见这个名字。',
			'Then history will forget us. If I am right, by dawn Europe will hear this name for the first time.', 'resolve')
	]
};

function getCampaignPrologueStory() {
	return CAMPAIGN_PROLOGUE.story.map(function (line) {
		return Object.assign({ chapter: CAMPAIGN_PROLOGUE.chapter, location: CAMPAIGN_PROLOGUE.location, scene: CAMPAIGN_PROLOGUE.scene }, line);
	});
}

var LEVELS_ORDER = [
	{
		id: 1, file: 'game1.html', name: '第 1 关 · 破晓防线', ai: null, difficulty: 1,
		mechanic: localizedText('基础指挥 · 集中兵力逐个击破', 'Basic Command · Concentrate and defeat in detail'),
		chapter: localizedText('第一幕 · 小直布罗陀', 'Act I · Little Gibraltar'),
		location: localizedText('穆尔格雷夫堡 · 1793年12月16日夜', 'Fort Mulgrave · Night of 16 December 1793'), scene: 'dawn',
		map: { lon: 5.93, lat: 43.12 },
		hint: localizedText('守军失去统一指挥，不会主动机动。让两翼互相策应，再集中火力逐支歼灭。', 'The garrison lacks unified command and will not maneuver. Keep both wings supporting each other, then concentrate on one unit at a time.'),
		retryHints: [
			localizedText('不要让所有部队挤向同一点；左右两翼各留一条接敌路线。', 'Do not funnel every unit through one point; keep a separate approach on each flank.'),
			localizedText('每次只集火一支守军，先制造歼敌来积累“战意”加成。', 'Focus one defender at a time and build Momentum from early eliminations.'),
			localizedText('步兵顶在前面，炮兵保持在远射程边缘输出。', 'Keep infantry in front and let artillery fire from the edge of its long range.')
		],
		story: [
			campaignLine('联军司令', localizedText('穆尔格雷夫堡守备部', 'Fort Mulgrave Garrison'), 'right', COALITION, '壕沟被雨水灌满了，但堡垒仍在。守住中央胸墙，法国人今夜过不来。', 'The trenches are flooded, but the fort still stands. Hold the central breastwork; the French will not pass tonight.', 'challenge'),
			campaignLine(localizedText('让・安多歇・朱诺', 'Jean-Andoche Junot'), localizedText('前线传令兵', 'Front-line Courier'), 'right', COURIER, '侦察确认，守军各段之间联络中断。他们人数不少，却只能各守各的位置。', 'Reconnaissance confirms the garrison sections have lost contact. They are numerous, but each group can only hold its own post.', 'report'),
			campaignLine('拿破仑', localizedText('炮兵指挥官', 'Artillery Commander'), 'left', NAPOLEON, '很好。火炮压住胸墙，步兵从两翼靠近。不要和整座堡垒作战——一次只撬开一块石头。', 'Good. Pin the parapet with artillery and bring infantry in from both flanks. Do not fight the whole fort—pry out one stone at a time.', 'command'),
			campaignLine(localizedText('让・安多歇・朱诺', 'Jean-Andoche Junot'), localizedText('前线传令兵', 'Front-line Courier'), 'right', COURIER, '突击队已经俯身穿过泥地，只等下一轮炮火落下。', 'The assault columns are crouched in the mud, waiting for the next salvo.', 'report'),
			campaignLine('拿破仑', localizedText('炮兵指挥官', 'Artillery Commander'), 'left', NAPOLEON, '炮声停下的那一刻，就是你们的破晓。开始。', 'The instant the guns fall silent will be your dawn. Begin.', 'resolve')
		],
		victoryStory: [
			campaignLine(localizedText('让・安多歇・朱诺', 'Jean-Andoche Junot'), localizedText('前线传令兵', 'Front-line Courier'), 'right', COURIER, '穆尔格雷夫堡的外墙已经失守，联军正在向埃吉莱特高地后撤！', 'Fort Mulgrave’s outer works have fallen. The coalition is withdrawing toward l’Eguillette!', 'report'),
			campaignLine('拿破仑', localizedText('炮兵指挥官', 'Artillery Commander'), 'left', NAPOLEON, '别停下来庆祝。把还能用的火炮转向海湾——真正决定土伦命运的高地就在前面。', 'Do not stop to celebrate. Turn every serviceable gun toward the bay—the heights that will decide Toulon are still ahead.', 'command'),
			campaignLine(localizedText('战地旁白', 'Battlefield Chronicle'), localizedText('史实节点', 'Historical Note'), 'right', ADJUTANT, '穆尔格雷夫堡的陷落打开了通往埃吉莱特的道路；围城战的重心由城墙转向港口。', 'The fall of Fort Mulgrave opened the road to l’Eguillette; the siege shifted from the city walls to control of the harbor.', 'report')
		]
	},
	{
		id: 2, file: 'game2.html', name: '第 2 关 · 炮火走廊', ai: null, difficulty: 2,
		mechanic: localizedText('兵种协同 · 步兵掩护远程炮火', 'Combined Arms · Screen long-range artillery with infantry'),
		chapter: localizedText('第二幕 · 港湾的钥匙', 'Act II · Key to the Harbor'),
		location: localizedText('埃吉莱特高地 · 1793年12月17日', 'Heights of l’Eguillette · 17 December 1793'), scene: 'battery',
		map: { lon: 1.44, lat: 43.60 },
		hint: localizedText('敌军固定火炮控制接近路线。让步兵吸引火力，己方炮兵从射程优势位置拆掉炮位。', 'A fixed enemy battery controls the approach. Let infantry draw its fire while your guns dismantle it from superior range.'),
		retryHints: [
			localizedText('先查看敌方火炮射程，不要让低生命散兵率先进入火力圈。', 'Inspect the enemy gun’s range first; do not send low-health skirmishers into it first.'),
			localizedText('炮兵只移动到刚好能开火的位置，减少接近中的空白回合。', 'Move artillery only far enough to begin firing, avoiding wasted approach turns.'),
			localizedText('用步兵卡住守军，骑兵从另一侧直插炮位。', 'Pin the infantry with line troops while cavalry reaches the battery from the other side.')
		],
		story: [
			campaignLine('联军司令', localizedText('埃吉莱特高地守备部', 'L’Eguillette Heights Command'), 'right', COALITION, '港湾就在脚下。只要这门炮还能封锁山道，法国人的火炮就上不来。', 'The harbor lies below. As long as this gun seals the road, the French cannot bring their batteries onto the heights.', 'challenge'),
			campaignLine(localizedText('让・安多歇・朱诺', 'Jean-Andoche Junot'), localizedText('前线传令兵', 'Front-line Courier'), 'right', COURIER, '埃吉莱特能同时俯瞰内外锚地。可固定炮已经校准山道，强攻会付出代价。', 'L’Eguillette overlooks both anchorages. But the fixed battery is already ranged on the road; a direct assault will be costly.', 'report'),
			campaignLine('拿破仑', localizedText('炮兵指挥官', 'Artillery Commander'), 'left', NAPOLEON, '所以步兵不是去和炮弹赛跑，而是替我们的炮兵遮住观察线。只要自己的火炮展开，射程会替我们赢下山道。', 'The infantry will not race the shells; it will blind the observers for our guns. Once our battery deploys, range will win the road.', 'resolve'),
			campaignLine(localizedText('炮兵军官', 'Artillery Officer'), localizedText('共和军围城炮兵', 'Republican Siege Artillery'), 'right', ADJUTANT, '炮架已经固定，葡萄弹与实心弹装填完毕。', 'The carriages are braced; canister and round shot are ready.', 'report'),
			campaignLine('拿破仑', localizedText('炮兵指挥官', 'Artillery Commander'), 'left', NAPOLEON, '夺下高地，让港里的每一艘联军军舰都明白：锚地已经不再安全。', 'Take the heights, and make every coalition ship understand that its anchorage is no longer safe.', 'command')
		],
		victoryStory: [
			campaignLine(localizedText('炮兵军官', 'Artillery Officer'), localizedText('埃吉莱特炮台', 'L’Eguillette Battery'), 'right', ADJUTANT, '炮口已经转向内港。英国舰船升起信号旗，码头和军火库同时燃起了火。', 'Our guns now face the inner harbor. British ships are raising signal flags, while fires spread through the docks and arsenal.', 'report'),
			campaignLine('拿破仑', localizedText('炮兵指挥官', 'Artillery Commander'), 'left', NAPOLEON, '他们不是在准备反击，而是在准备撤离。土伦已经失去继续坚守的理由。', 'They are not preparing a counterattack—they are preparing to leave. Toulon has lost every reason to hold out.', 'resolve'),
			campaignLine(localizedText('战地旁白', 'Battlefield Chronicle'), localizedText('1793年12月22日', '22 December 1793'), 'right', ADJUTANT, '联军撤出土伦后，二十四岁的波拿巴被擢升为准将。他第一次从无名军官变成共和国瞩目的将领。', 'After the coalition evacuated Toulon, the twenty-four-year-old Bonaparte was promoted to brigadier general—his first leap from obscurity.', 'report')
		]
	},
	{
		id: 3, file: 'game3.html', name: '第 3 关 · 晨雾突骑', ai: { strategy: 'breakthrough', openingDelay: 2, cavalryPriority: false }, difficulty: 3,
		mechanic: localizedText('主动突击 · 前 2 步整队，第 3 步迎敌', 'Active Assault · Form up for two turns before contact'),
		chapter: localizedText('第三幕 · 雾中的缺口', 'Act III · A Gap in the Fog'),
		location: localizedText('耶拿高原 · 1806年10月14日清晨', 'Jena Plateau · Morning of 14 October 1806'), scene: 'fog',
		map: { lon: 11.59, lat: 50.93 },
		hint: localizedText('浓雾中的敌军会先整队两步，再扑向最近单位。步兵护住炮兵，骑兵与散兵从两翼夹击。', 'The enemy reforms for two turns in the fog, then attacks the nearest unit. Screen your guns and strike from both flanks.'),
		retryHints: [
			localizedText('前两步拉成弧形阵线，不要把骑兵单独送进雾里。', 'Use the first two turns to form a curved line; do not send cavalry into the fog alone.'),
			localizedText('让耐久高的步兵成为最近目标，炮兵在其后持续射击。', 'Make durable infantry the nearest target while artillery fires from behind them.'),
			localizedText('敌军一翼被牵住后，骑兵绕击另一翼并及时脱离。', 'Once one wing is pinned, sweep around the other with cavalry and pull out promptly.')
		],
		story: [
			campaignLine('萨瓦里', '副官', 'right', ADJUTANT, '清晨六点，雾浓得看不见谷底。内伊元帅已经抢先投入战斗，却和后续步兵脱节。', 'It is six in the morning, and the fog hides the valley. Marshal Ney has entered too early and become separated from the following infantry.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '他的勇气总比命令快一步。普鲁士—萨克森军还在高原上展开，我们有两轮命令把缺口补上。', 'His courage always outruns his orders. The Prussian-Saxon army is still deploying; we have two commands to close the gap.', 'resolve'),
			campaignLine('联军司令', localizedText('霍恩洛厄军团司令部', 'Hohenlohe’s Army Command'), 'right', COALITION, '雾会掩住我们的整队，也会吞掉法军骑兵。稳住阵线，等他们自己撞上来。', 'The fog will conceal our deployment—and swallow the French cavalry. Hold the line and let them blunder into us.', 'challenge'),
			campaignLine('萨瓦里', '副官', 'right', ADJUTANT, '拉纳在中央，奥热罗在左翼，苏尔特正从右翼赶来。各军团都在等待统一信号。', 'Lannes holds the center, Augereau the left, and Soult is arriving from the right. Every corps is waiting for one signal.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '先整队，再让最近的敌人以为他找到了突破口。等雾散开，我们的两翼会替他合上那扇门。', 'Form up first, then let the nearest enemy believe he has found a breach. When the fog lifts, our wings will close that door.', 'command')
		],
		victoryStory: [
			campaignLine('萨瓦里', '副官', 'right', ADJUTANT, '霍恩洛厄的阵线正在瓦解。还有北方急报——达武元帅在奥尔施塔特遭遇了普军主力。', 'Hohenlohe’s line is collapsing. A northern dispatch says Marshal Davout met the main Prussian army at Auerstedt.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '第三军兵力远少于他们。告诉我，达武守住了吗？', 'The III Corps is badly outnumbered. Tell me—did Davout hold?', 'resolve'),
			campaignLine('萨瓦里', '副官', 'right', ADJUTANT, '不只守住了，陛下。他击败了普军主力。耶拿与奥尔施塔特在同一天，变成了一场双重胜利。', 'He did more than hold, Sire. He defeated the main Prussian army. Jena and Auerstedt became a double victory on the same day.', 'report')
		]
	},
	{
		id: 4, file: 'game4.html', name: '第 4 关 · 双胜逐猎', ai: { strategy: 'flee', fleeTo: { x: 9.5, y: -0.5 } }, difficulty: 4,
		mechanic: localizedText('追击封锁 · 抢占退路，最多放走 2 支', 'Pursuit · Seal the escape route; at most two may pass'),
		chapter: localizedText('第四幕 · 王国崩塌', 'Act IV · Collapse of a Kingdom'),
		location: localizedText('奥尔施塔特—魏玛道路 · 1806年10月14日', 'Auerstedt–Weimar Road · 14 October 1806'), scene: 'river',
		map: { lon: 13.40, lat: 52.52 },
		hint: localizedText('普军正向右上方退路溃逃。骑兵提前绕行封锁出口，最多只能放走两支部队。', 'The Prussians are fleeing toward the upper-right exit. Send cavalry ahead to seal it; no more than two units may escape.'),
		retryHints: [
			localizedText('开局就让骑兵斜插右上出口，不要从溃兵后方排队追。', 'Send cavalry diagonally toward the upper-right exit immediately; do not queue behind the fugitives.'),
			localizedText('步兵逼迫中路，炮兵优先削弱离出口最近的敌军。', 'Use infantry to press the center while artillery weakens enemies closest to the exit.'),
			localizedText('两支敌军逃脱仍可通关；不要为追残兵放空整条封锁线。', 'You may still win after two escapes; do not abandon the blockade to chase one damaged unit.')
		],
		story: [
			campaignLine('联军司令', localizedText('普鲁士残部指挥部', 'Prussian Remnant Command'), 'right', COALITION, '不必再维持队形！向东北撤退，越过那条道路就能与后方军团会合。', 'Forget the formation! Withdraw northeast; beyond that road we can rejoin the rearward corps.', 'challenge'),
			campaignLine('萨瓦里', '副官', 'right', ADJUTANT, '达武以第三军挡住了普军主力。布伦瑞克公爵重伤后，指挥链已经断裂；两处战场的溃兵正挤在同一条路上。', 'Davout’s III Corps held the main Prussian army. With the Duke of Brunswick mortally wounded, command has broken, and fugitives from both fields crowd one road.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '一个军击败一支主力军……达武今天赢得的不只是战斗，还有元帅杖上的新名字。', 'One corps defeating an army… Davout has won more than a battle today; he has earned a new name for his marshal’s baton.', 'resolve'),
			campaignLine('萨瓦里', '副官', 'right', ADJUTANT, '若让残部重新集结，柏林方向仍会出现第二道防线。', 'If these remnants regroup, another defensive line may form on the road to Berlin.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '不给他们第二次列队的时间。骑兵抢到前面，步兵从后压迫——合上这张网。', 'Give them no time to form again. Cavalry ahead, infantry pressing from behind—close the net.', 'command')
		],
		victoryStory: [
			campaignLine('萨瓦里', '副官', 'right', ADJUTANT, '出口已经封住。逃出战场的部队无法再组成完整军团，通往柏林的道路正在敞开。', 'The exit is sealed. The units that escaped cannot form a coherent army; the road to Berlin is opening.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '追击的意义不在于多俘虏几面旗，而在于让敌人明天醒来时，发现自己已经没有军队。', 'Pursuit is not about a few more colors. It is about ensuring the enemy wakes tomorrow to find he no longer has an army.', 'resolve'),
			campaignLine(localizedText('战地旁白', 'Battlefield Chronicle'), localizedText('史实节点', 'Historical Note'), 'right', ADJUTANT, '耶拿—奥尔施塔特的双重失败引发普军全面崩溃；法军随后迅速进入柏林。', 'The twin defeats at Jena and Auerstedt triggered the collapse of the Prussian army, and French forces soon entered Berlin.', 'report')
		]
	},
	{
		id: 5, file: 'game5.html', name: '第 5 关 · 烈焰攻坚', ai: null, difficulty: 5,
		mechanic: localizedText('限时攻坚 · 18 步内突破纵深防线', 'Timed Siege · Break the layered defense within 18 turns'),
		chapter: localizedText('第五幕 · 得城失敌', 'Act V · A City Won, an Army Lost'),
		location: localizedText('斯摩棱斯克 · 1812年8月16—18日', 'Smolensk · 16–18 August 1812'), scene: 'embers',
		map: { lon: 31.00, lat: 54.60 },
		hint: localizedText('俄军后卫依托城墙与固定炮兵拖延。必须顶着火力迅速集火，否则守军撤走后只会留下燃烧的城市。', 'The Russian rearguard uses walls and fixed guns to buy time. Concentrate under fire, or the army will escape and leave only a burning city.'),
		retryHints: [
			localizedText('这是限时全歼战；掷弹兵先顶住第一轮火力，不要在远处逐格试探。', 'This is timed elimination; let grenadiers absorb the opening fire instead of probing one tile at a time.'),
			localizedText('炮兵优先打中墙单位，打开多支部队能共同射击的缺口。', 'Use artillery on the central wall unit first, opening a gap where several allies can fire together.'),
			localizedText('中路牵制、骑兵绕侧、散兵补刀，避免火力平均分散。', 'Pin the center, flank with cavalry, and let skirmishers finish damaged units; do not spread fire evenly.')
		],
		story: [
			campaignLine(localizedText('加斯帕尔・古尔戈', 'Gaspard Gourgaud'), '副官', 'right', ADJUTANT, '巴克莱与巴格拉季昂的军队终于在斯摩棱斯克会合，但仍不愿决战，只留下后卫守城。', 'Barclay and Bagration have joined near Smolensk, yet still refuse a decisive battle and have left only a rearguard in the city.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '从涅曼河到这里，他们一直向东退。若主力又从第聂伯河彼岸脱身，我们得到的只会是一座空城。', 'They have withdrawn eastward from the Niemen. If the main army escapes across the Dnieper again, we will win only an empty city.', 'resolve'),
			campaignLine(localizedText('俄军将领', 'Russian Commander'), localizedText('斯摩棱斯克后卫部队', 'Smolensk Rearguard'), 'right', COALITION, '守住城墙直到夜幕。主力必须完整退向莫斯科；桥梁最后再毁，仓库不能留给法国人。', 'Hold the walls until nightfall. The main army must withdraw intact toward Moscow; destroy the bridges last and leave no stores.', 'challenge'),
			campaignLine('传令兵', '近卫骑兵通讯队', 'right', COURIER, '城内已经起火。炮击、巷战和撤退命令混在一起，粮仓也在燃烧。', 'The city is burning. Bombardment, street fighting, and withdrawal orders have merged into chaos; the granaries are aflame.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '比火焰更快。击穿纵深、夺下渡口——我要的是俄军主力，不是一堆写着胜利的灰烬。', 'Move faster than the flames. Break the depth and seize the crossings—I want the Russian army, not ashes labeled victory.', 'command')
		],
		victoryStory: [
			campaignLine(localizedText('加斯帕尔・古尔戈', 'Gaspard Gourgaud'), '副官', 'right', ADJUTANT, '最后一处阵地已经肃清。可是俄军主力连夜渡过第聂伯河，桥也被毁了。', 'The last position is clear. But the Russian main army crossed the Dnieper during the night and destroyed the bridge.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '我们占领了城市，却没有得到会结束战争的那场胜利。', 'We have taken the city, but not the victory that would end the war.', 'resolve'),
			campaignLine('传令兵', '近卫骑兵通讯队', 'right', COURIER, '补给官报告，能用的仓库所剩无几。俄军正继续向莫斯科撤退。', 'The quartermasters report that few usable stores remain. The Russians are still withdrawing toward Moscow.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '地图上向东的一寸，在现实里会吞掉成千上万双靴子。可现在，我们已经停不下来了。', 'One inch eastward on a map consumes thousands of boots in reality. Yet now we can no longer stop.', 'resolve')
		]
	},
	{
		id: 6, file: 'game6.html', name: '第 6 关 · 利尼决战', ai: { strategy: 'breakthrough', threat: 'strongest' }, difficulty: 6,
		mechanic: localizedText('精准集火 · 敌军优先猎杀我方核心火力', 'Focused Assault · The enemy hunts your strongest units'),
		chapter: localizedText('第六幕 · 百日最后一胜', 'Act VI · The Last Victory of the Hundred Days'),
		location: localizedText('利尼 · 1815年6月16日', 'Ligny · 16 June 1815'), scene: 'storm',
		map: { lon: 4.58, lat: 50.51 },
		hint: localizedText('普军会优先集火炮兵和骑兵。用掷弹兵、步兵遮蔽核心火力，再击穿普军中央。', 'The Prussians focus your artillery and cavalry. Screen them with grenadiers and infantry, then break the Prussian center.'),
		retryHints: [
			localizedText('炮兵和骑兵不要并排暴露；让两支步兵分别挡住最短接近路线。', 'Do not expose artillery and cavalry side by side; block the shortest approaches with two infantry units.'),
			localizedText('敌军追高攻击单位，可用骑兵横向牵引，再由炮兵打侧面。', 'Because the enemy hunts high-attack units, pull it sideways with cavalry and strike its flank with artillery.'),
			localizedText('受伤核心及时后撤；敌军换目标的一回合就是重新排阵的窗口。', 'Withdraw a damaged core unit; the turn in which enemies retarget is your chance to reform.')
		],
		story: [
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '威灵顿在四臂村，布吕歇尔在利尼。唯一的胜机，是在他们会合前把两支联军分开击破。', 'Wellington is at Quatre Bras and Blücher at Ligny. Our only chance is to defeat the allied armies separately before they unite.', 'resolve'),
			campaignLine(localizedText('加斯帕尔・古尔戈', 'Gaspard Gourgaud'), '副官', 'right', ADJUTANT, '内伊正牵制英荷军，但德尔隆第一军的命令发生冲突。原本用于包围普军的兵力还没有出现。', 'Ney is holding the Anglo-Allied army, but conflicting orders have diverted d’Erlon’s I Corps. The enveloping force has not appeared.', 'report'),
			campaignLine(localizedText('布吕歇尔', 'Gebhard von Blücher'), localizedText('普鲁士陆军元帅', 'Prussian Field Marshal'), 'right', COALITION, '法国人想从中央把我们劈开。集中火力先打掉他们的炮兵和骑兵，等威灵顿赶来！', 'The French mean to split us through the center. Concentrate on their guns and cavalry first, and hold until Wellington arrives!', 'challenge'),
			campaignLine(localizedText('加斯帕尔・古尔戈', 'Gaspard Gourgaud'), '副官', 'right', ADJUTANT, '普军正在放弃外围，把兵力压进利尼村和中央高地。', 'The Prussians are yielding the edges and packing their strength into Ligny village and the central heights.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '那正是他们最脆弱的地方。近卫军留到最后，步兵护住火炮——黄昏前击穿中央。', 'That is precisely where they are weakest. Hold the Guard until the end, screen the guns, and break the center before dusk.', 'command')
		],
		victoryStory: [
			campaignLine(localizedText('加斯帕尔・古尔戈', 'Gaspard Gourgaud'), '副官', 'right', ADJUTANT, '普军中央崩溃，布吕歇尔在骑兵冲锋中坠马，近卫军已经越过利尼村。', 'The Prussian center has broken. Blücher was unhorsed during the cavalry charge, and the Guard has passed through Ligny.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '胜利了，但还不够。格鲁希必须紧追，让普军向东退，而不是转向威灵顿。', 'A victory—but not enough. Grouchy must pursue and drive the Prussians east, not let them turn toward Wellington.', 'command'),
			campaignLine(localizedText('战地旁白', 'Battlefield Chronicle'), localizedText('史实节点', 'Historical Note'), 'right', ADJUTANT, '利尼成为拿破仑最后一次战场胜利。然而普军没有被摧毁，而是向北退往瓦夫尔；两天后，他们仍能赶到滑铁卢。', 'Ligny became Napoleon’s final battlefield victory. But the Prussians were not destroyed; they withdrew north toward Wavre and still reached Waterloo two days later.', 'report'),
			campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '两天。我们只比历史早了两天，也只剩两天去改变它。', 'Two days. We stand only two days ahead of history—and have only two days left to change it.', 'resolve')
		]
	}
];

/* 隐藏关：从滑铁卢史实条件出发，胜利结果明确属于架空历史。 */
var HIDDEN_LEVEL = {
	id: 7, file: 'game7.html', name: '第 7 关 · 滑铁卢改写（隐藏）',
	ai: { strategy: 'guarded_core', ringRadius: 1.65, collapseThreat: 'weakest', cavalryPriority: false }, difficulty: 7,
	mechanic: localizedText('双层近卫阵 · 摧毁核心后迎击全线反扑', 'Layered Guard · Destroy the core, then survive the counterattack'),
	chapter: localizedText('终幕 · 未写之史', 'Finale · The Unwritten History'),
	location: localizedText('蒙圣让高地 · 1815年6月18日', 'Mont-Saint-Jean · 18 June 1815'), scene: 'twilight',
	map: { lon: 3.08, lat: 49.05 },
	hint: localizedText('雨后泥地压慢进攻，联军以近卫核心、双炮位和步兵环阵互保。先摧毁核心；核心倒下后，残军会转为猎杀伤兵。', 'Rain-soaked ground slows the attack. A Guard core, twin batteries, and an infantry ring protect one another. Destroy the core first; survivors then hunt your wounded.'),
	retryHints: [
		localizedText('不要平均削血：双炮先压制核心同一侧的护卫，再扩大缺口。', 'Do not spread damage evenly: use both guns on one side of the guard ring, then widen the breach.'),
		localizedText('核心存活时敌军维持环阵；骑兵佯攻一翼，主力从另一翼集中突入。', 'While the core lives, feint with cavalry on one wing and mass the main attack on the other.'),
		localizedText('核心倒下前撤走残血单位；第二阶段敌军会立即追击生命最低者。', 'Pull wounded units back before the core falls; phase two immediately pursues the lowest-health target.'),
		localizedText('只有 21 回合。第 8 回合仍未打开缺口，就用“回退”重新规划开局。', 'You have only 21 turns. If no breach exists around turn eight, use Undo and rethink the opening.')
	],
	story: [
		campaignLine('传令兵', '近卫骑兵通讯队', 'right', COURIER, '昨夜的大雨把道路变成泥浆。联军主力藏在蒙圣让山脊后，乌古蒙和拉艾圣庄园锁住了两翼。', 'Last night’s rain turned the roads to mud. The allied army is concealed behind the ridge, with Hougoumont and La Haye Sainte anchoring its flanks.', 'report'),
		campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '史实里，我们把上午耗在泥地和乌古蒙；等中央真正动摇时，普军已经从普朗斯努瓦赶来。', 'In recorded history, we spent the morning in the mud and at Hougoumont. By the time the center wavered, the Prussians were arriving through Plancenoit.', 'resolve'),
		campaignLine(localizedText('威灵顿', 'Arthur Wellesley, Duke of Wellington'), localizedText('英荷联军总司令', 'Anglo-Allied Commander'), 'right', COALITION, '步兵留在反斜面，方阵护住核心，炮兵交叉覆盖。只要布吕歇尔出现，时间就在我们这边。', 'Keep infantry on the reverse slope, squares around the center, and batteries in crossfire. Once Blücher appears, time is on our side.', 'challenge'),
		campaignLine(localizedText('加斯帕尔・古尔戈', 'Gaspard Gourgaud'), '副官', 'right', ADJUTANT, '敌军双炮形成交叉射界，近卫核心外还有一整圈护卫。二十一轮命令后，普军先头部队就会接触战场。', 'Twin batteries overlap their fields, and a full guard ring surrounds the core. In twenty-one commands, the Prussian vanguard will reach the field.', 'report'),
		campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '这一次不把兵力丢进无底洞。炮兵撕开同一个缺口，步兵跟进，近卫军只在决定胜负时前进。', 'This time we will not pour men into a bottomless pit. The guns tear one breach, infantry widens it, and the Guard advances only to decide the battle.', 'command'),
		campaignLine('联军司令', localizedText('蒙圣让核心防线', 'Mont-Saint-Jean Central Line'), 'right', COALITION, '你可以改写命令，却改不了这片山脊。旧近卫军会在这里第二次倒下。', 'You may rewrite the orders, but not this ridge. The Old Guard will fall here a second time.', 'challenge'),
		campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '历史给了我一场失败。你给我二十一回合——足够了。', 'History gave me one defeat. You give me twenty-one turns—that will be enough.', 'resolve')
	],
	victoryStory: [
		campaignLine('传令兵', '近卫骑兵通讯队', 'right', COURIER, '拉艾圣已经在普军抵达前失守！联军中央后退，近卫军的鹰旗仍在向前！', 'La Haye Sainte has fallen before the Prussians arrive! The allied center is giving way, and the Guard’s eagles still advance!', 'report'),
		campaignLine(localizedText('威灵顿', 'Arthur Wellesley, Duke of Wellington'), localizedText('英荷联军总司令', 'Anglo-Allied Commander'), 'right', COALITION, '中央无法再维持。命令全军撤退——必须在法军封住布鲁塞尔道路前脱离。', 'The center cannot hold. Order a general retreat—we must disengage before the French close the Brussels road.', 'challenge'),
		campaignLine(localizedText('加斯帕尔・古尔戈', 'Gaspard Gourgaud'), '副官', 'right', ADJUTANT, '普军先头部队看见联军旗帜后退，正在瓦夫尔道路上停顿。', 'The Prussian vanguard has seen the allied colors withdrawing and is hesitating on the road from Wavre.', 'report'),
		campaignLine('拿破仑', '法兰西皇帝', 'left', NAPOLEON, '记下这一刻：近卫军没有后退。滑铁卢不再是一座坟墓，而是帝国第二次升起的太阳。', 'Write down this moment: the Guard did not recoil. Waterloo is no longer a grave, but the sun rising over the Empire a second time.', 'resolve'),
		campaignLine(localizedText('战地旁白', 'Battlefield Chronicle'), localizedText('架空历史分歧点', 'Alternate-History Divergence'), 'right', ADJUTANT, '从这一句开始，故事离开正史：联军中央在普军完成会合前崩溃，欧洲走进了从未发生过的结局。', 'From this line onward, the story leaves recorded history: the allied center collapses before the Prussians unite, and Europe enters an ending that never occurred.', 'report')
	]
};

/* 实验关不进入主战役地图，但仍获得剧情与连续失败提示。 */
var SUPPLEMENTAL_LEVELS = [{
	id: 8, file: 'game8.html', name: '第 8 关 · 最后防线', ai: null, difficulty: 7,
	mechanic: localizedText('炮兵部署 · 守住红线十二回合', 'Gun Deployment · Hold the line for twelve turns'),
	chapter: localizedText('外传 · 巴黎城门', 'Side Story · The Gates of Paris'),
	location: localizedText('巴黎保卫战 · 1814年3月30日', 'Defense of Paris · 30 March 1814'), scene: 'embers',
	hint: localizedText('先部署五门火炮，再守住红线十二回合；交叉射界比把火炮排成一条直线更有效。', 'Deploy all five guns, then hold for twelve turns. Overlapping fields of fire beat one straight gun line.'),
	retryHints: [
		localizedText('让射程圆彼此重叠，不要把五门炮平均撒在整张地图上。', 'Overlap the range circles; do not spread five guns evenly across the map.'),
		localizedText('中央放两门互保火炮，两翼用斜射火力覆盖红线入口。', 'Place two mutually supporting guns in the center and cover each flank entrance with oblique fire.'),
		localizedText('优先消灭速度快、离红线近的敌军；敌方炮兵可稍后处理。', 'Prioritize fast enemies near the red line; enemy artillery can be handled later.')
	],
	story: [
		campaignLine(localizedText('奥古斯特・马尔蒙', 'Auguste de Marmont'), localizedText('巴黎守军元帅', 'Marshal Defending Paris'), 'left', NAPOLEON, '联军已逼近巴黎高地。皇帝不在城中，我们只有仓促集结的守军和火炮。', 'The coalition has reached the heights outside Paris. The Emperor is absent; we have only hastily assembled defenders and guns.', 'resolve'),
		campaignLine(localizedText('炮兵军官', 'Artillery Officer'), localizedText('巴黎国民卫队', 'Paris National Guard'), 'right', ADJUTANT, '五门火炮等待部署。若射界彼此割裂，敌军会从缝隙直冲城门。', 'Five guns await deployment. If their fields are isolated, the enemy will pass through the gaps and reach the gates.', 'report'),
		campaignLine(localizedText('奥古斯特・马尔蒙', 'Auguste de Marmont'), localizedText('巴黎守军元帅', 'Marshal Defending Paris'), 'left', NAPOLEON, '让每一道射界盖住下一道。我们未必能赢下战争，但必须为巴黎争取十二轮命令。', 'Make every field cover the next. We may not win the war, but we must buy Paris twelve commands.', 'command')
	],
	victoryStory: [
		campaignLine(localizedText('炮兵军官', 'Artillery Officer'), localizedText('巴黎国民卫队', 'Paris National Guard'), 'right', ADJUTANT, '最后一轮炮击结束，红线仍在我们手中。伤员和市民已经撤入内城。', 'The final salvo is over, and the red line remains ours. The wounded and civilians have withdrawn into the inner city.', 'report'),
		campaignLine(localizedText('战地旁白', 'Battlefield Chronicle'), localizedText('史实节点', 'Historical Note'), 'right', ADJUTANT, '史实中的巴黎守军最终议和并撤出城市；拿破仑数日后第一次退位。这场胜利只是游戏给予守军的另一种可能。', 'Historically, the defenders negotiated and withdrew from Paris; Napoleon abdicated days later. This victory is an alternate possibility.', 'report')
	]
}];

function getLevelList() { return LEVELS_ORDER; }
function getHiddenLevel() { return HIDDEN_LEVEL; }

function getLevelById(id) {
	return LEVELS_ORDER.concat([HIDDEN_LEVEL], SUPPLEMENTAL_LEVELS).find(function (level) {
		return Number(level.id) === Number(id);
	}) || null;
}

function getLevelIndex(id) {
	return LEVELS_ORDER.findIndex(function (level) { return Number(level.id) === Number(id); });
}

function nextLevelFile(id) {
	var index = getLevelIndex(id);
	if (index < 0) return './end-game.html';
	var next = LEVELS_ORDER[index + 1];
	return next ? next.file : './end-game.html';
}

function attachLevelAI(id) {
	if (typeof CURRENT_GAME === 'undefined' || !CURRENT_GAME) return;
	var meta = getLevelById(id);
	CURRENT_GAME.ai = (meta && meta.ai) ? meta.ai : null;
}

/* 主要代码，负责加载页面，保持游戏运行，判断通关 */

let armys = new Array(0);
let n = 0, m = 0, piece_cnt = 0, remain_turns = 0;
let eps = 0.000001;
let footerMode = 'goal';
let resumedLevel = null;
const UNIT_MIN_SEPARATION = 0.56;
const MAX_UNDO_USES = 3;
const MAX_BATTLE_MOMENTUM = 3;
let undoStack = [];
let undoUses = 0;
let battleMomentum = 0;

let boardContainer = document.getElementById('board'); // 维护 board 的容器, 以备后续使用
let buttonContainer = document.getElementById('button'); // 维护 button 的容器, 以备后续使用

function gameText(key, vars, fallback) {
	return (typeof uiT === 'function') ? uiT(key, vars, fallback) : (fallback || key);
}

function gameContent(value) {
	return (typeof uiLocalize === 'function') ? uiLocalize(value) : (value || '');
}

/* 连续歼敌会累积“战意”：每级令蓝方下一步攻击提高 8%，最高 3 级。
 * 它让集中火力真正有奖励，但上限只有 24%，不会把后期关卡滚成无脑碾压。 */
function battleAttackPower(unit) {
	const base = Math.max(0, Number(unit && unit.atk) || 0);
	return unit && unit.color === 'blue' ? base * (1 + battleMomentum * 0.08) : base;
}

function aliveUnitCount(color) {
	return armys.filter(function (unit) { return unit.color === color && !unit.disabled; }).length;
}

function renderBattleStatus() {
	let strip = document.getElementById('battle-status');
	const heading = document.querySelector('.game-heading');
	const meta = (typeof getLevelById === 'function' && typeof CURRENT_LEVEL_ID !== 'undefined')
		? getLevelById(CURRENT_LEVEL_ID)
		: null;
	if (!heading || !meta) {
		if (strip) strip.style.display = 'none';
		return;
	}
	if (!strip) {
		strip = document.createElement('div');
		strip.id = 'battle-status';
		strip.className = 'battle-status';
		strip.setAttribute('aria-live', 'polite');
		heading.appendChild(strip);
	}
	strip.style.removeProperty('display');
	strip.innerHTML = '';
	const items = [
		gameText('game.difficulty', { level: Math.max(1, Math.min(7, Number(meta.difficulty) || 1)) }, '威胁 ' + (meta.difficulty || 1) + '/7'),
		gameText('game.enemyRemain', { count: aliveUnitCount('red') }, '敌军 ' + aliveUnitCount('red')),
		gameText('game.momentum', { level: battleMomentum, bonus: battleMomentum * 8 }, '战意 ' + battleMomentum + '/3 · +' + (battleMomentum * 8) + '%')
	];
	items.forEach(function (label, index) {
		const item = document.createElement('span');
		item.className = 'battle-status__item' + (index === 2 && battleMomentum ? ' is-active' : '');
		item.textContent = label;
		strip.appendChild(item);
	});
	strip.title = gameContent(meta.mechanic || meta.hint || '');
}

function updateBattleMomentum(defeatedThisTurn) {
	const before = battleMomentum;
	if (defeatedThisTurn > 0) battleMomentum = Math.min(MAX_BATTLE_MOMENTUM, battleMomentum + defeatedThisTurn);
	else battleMomentum = Math.max(0, battleMomentum - 1);
	if (defeatedThisTurn > 0 && typeof toast === 'function') {
		toast(gameText('game.momentumGain', {
			kills: defeatedThisTurn,
			level: battleMomentum,
			bonus: battleMomentum * 8
		}, '歼敌 ' + defeatedThisTurn + ' 支，战意升至 ' + battleMomentum + '/3：下步攻击 +' + (battleMomentum * 8) + '%。'));
	}
	if (before !== battleMomentum || defeatedThisTurn > 0) renderBattleStatus();
}

/* 统一重画回合提示，语言切换时不刷新战局。 */
function renderFooterStatus() {
	const bar = document.getElementById('footer-bar');
	if (!bar) return;
	bar.innerHTML = '';
	if (footerMode === 'goal') {
		bar.appendChild(document.createTextNode(gameText('game.goalStart', null, '消灭全部')));
		const red = document.createElement('span');
		red.id = 'red-hinter';
		red.textContent = gameText('game.goalRed', null, '红方');
		red.style.fontStyle = 'italic';
		red.style.textDecoration = 'underline';
		red.addEventListener('click', showRedEffect);
		bar.appendChild(red);
		bar.appendChild(document.createTextNode(gameText('game.goalEnd', { turns: remain_turns }, '部队即可获胜！——你有 ' + remain_turns + ' 回合。')));
		return;
	}
	if (footerMode === 'resume') {
		bar.textContent = gameText('game.resumed', { level: resumedLevel, turns: remain_turns }, '已读取第 ' + resumedLevel + ' 关存档，还剩 ' + remain_turns + ' 回合。');
		return;
	}
	if (remain_turns <= 5) bar.textContent = gameText('game.turnsUrgent', { turns: remain_turns }, '只剩 ' + remain_turns + ' 回合！');
	else if (remain_turns <= 10) bar.textContent = gameText('game.turnsFew', { turns: remain_turns }, '还剩 ' + remain_turns + ' 回合。');
	else bar.textContent = gameText('game.turns', { turns: remain_turns }, '剩余 ' + remain_turns + ' 回合。');
}

// 初始化棋盘，添加箭头
function getblock() {
	let html = '';
	for(let i = 0; i < n; ++ i) for(let j = 0; j < m; ++ j) html += `<div class="cell" data-row="${i}" data-col="${j}"></div>`;
	return html + `<svg id="arrowSvg" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:5;">
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
      <polygon points="0 0, 6 2, 0 4" fill="#ff4444" />
    </marker>
  </defs>
  <line id="arrowLine"
        x1="0" y1="0" x2="0" y2="0"
        stroke="#ff4444"
        stroke-width="2"
        stroke-dasharray="6, 4"
        marker-end="url(#arrowhead)"
        style="display:none;" />
</svg>`;
}

// 对于每一类棋子生成对应的 html
function getHtmlForPiece(element) {
	if(element.img) return `<img src='./img/${element.img}.webp' style='width: 120%; height: 120%;' alt='${element.class}' draggable='false' decoding='async'></img>`;
	else return `<p>${element.class}</p>` ;
}

/* 棋盘顶端实时血条：数据仍只存于 armys，DOM 只负责显示。 */
function updateUnitHealth(unit) {
	if (!unit || !unit.id) return;
	const piece = document.getElementById(unit.id);
	if (!piece) return;
	let bar = piece.querySelector('.unit-health');
	if (!bar) {
		bar = document.createElement('span');
		bar.className = 'unit-health';
		bar.setAttribute('aria-hidden', 'true');
		bar.innerHTML = '<span class="unit-health__fill"></span>';
		piece.appendChild(bar);
	}
	const max = Math.max(Number(unit.lpMax) || Number(unit.lp) || 1, 1);
	const ratio = Math.max(0, Math.min(1, Number(unit.lp) / max));
	bar.style.setProperty('--unit-health', (ratio * 100).toFixed(1) + '%');
	bar.classList.toggle('is-wounded', ratio <= 0.55);
	bar.classList.toggle('is-critical', ratio <= 0.25);
}

function updateAllUnitHealth() {
	armys.forEach(updateUnitHealth);
}

// 以备后续计算棋子位置使用
let distance, offset, arrowLine;

// 将由 html 表示的位置坐标转换为用cell数表示
function getPosByCell(pos) {
	return (pos - offset) / distance ;
}
/* 鼠标坐标 → 棋盘图层坐标所用的原点。
 * 棋子 / 常驻箭头 / 范围圈 / 框选矩形都是 #board 的绝对定位子元素，
 * 它们的坐标原点 = #board 的 padding box（边框以内）；而 getBoundingClientRect()
 * 返回的是 border box（含边框）。B 的美化给 #board 加了 9px 边框（窄屏 6px），
 * 不扣掉就会让「鼠标跟随的预览箭头」和「点地下令的目标点」整体偏移一个边框宽度。
 * clientLeft / clientTop 正好等于左/上边框宽度，且随断点自动变化，故用它修正。 */
function boardContentRect() {
	const r = boardContainer.getBoundingClientRect();
	return {
		left: r.left + boardContainer.clientLeft,
		top: r.top + boardContainer.clientTop
	};
}

// 加载游戏
function loadGame(game) {
	resetUndoHistory();
	battleMomentum = 0;
	document.body.classList.add('level-opening');   // 从 demo-美化好 移植：开场隐藏战场，等 revealBattlefield() 淡入
	n = game.n; m = game.m; remain_turns = game.turns_limit;
	boardContainer.style.gridTemplateColumns = `repeat(${m}, 1fr)`;
	boardContainer.innerHTML = getblock(n, m);
	arrowLine = document.getElementById('arrowLine');
	let POS_00 = document.querySelector(`#board .cell[data-row="${0}"][data-col="${0}"]`).getBoundingClientRect();
	let POS_11 = document.querySelector(`#board .cell[data-row="${1}"][data-col="${1}"]`).getBoundingClientRect();
	distance = POS_11.left - POS_00.left;
	offset = POS_00.width / 2.0;
	/* 加载初始棋盘，计算棋子移动所需常量 */
	/* 棋盘是一个长和宽都是 80dvh 的的窗口，分成 n x m 个 cell，主要是方便布置棋子 */
	/* 在现有的代码中，n 和 m 都保持为 10 */

	footerMode = 'goal';
	resumedLevel = null;
	renderFooterStatus();
	/* 加载胜利条件与回合限制 */

	game.pieces.forEach(element => {
		piece = document.createElement('div');
  	piece.className = `chess chess--${element.color}`;
		piece.id = `piece-${piece_cnt}`;
		piece.innerHTML = getHtmlForPiece(element)
  	boardContainer.appendChild(piece);
		armys.push({
			id: piece.id,
			color: element.color,
			posx: element.posx,
			posy: element.posy,
			speed: element.speed,
			targetx: element.posx,
			targety: element.posy,
			atkrange: element.atkrange,
			atk: element.atk,
			lp: element.lp,
			lpMax: element.lp,
			disabled: false,
			cls: element.class,
			img: element.img || ''
		}) ;
		updateUnitHealth(armys[armys.length - 1]);
		movePieceTo(piece.id, -1.0, -1.0);
		movePieceTo(piece.id, armys[piece_cnt].posx, armys[piece_cnt].posy);
		piece_cnt ++ ;
	}) ;
	/* 加载棋子 */
	renderOrderArrows();
	renderBattleStatus();
	showLevelIntro();
}

/* 从存档快照恢复一局（to-do #2/#3）：重建棋盘与棋子，字段与 captureSnapshot() 一一对应 */
function loadSnapshot(snap) {
	resetUndoHistory();
	battleMomentum = Math.max(0, Math.min(MAX_BATTLE_MOMENTUM, Number(snap.momentum) || 0));
	n = snap.n; m = snap.m; remain_turns = snap.remain_turns; piece_cnt = 0; armys = new Array(0);
	selectedPieces = [];
	selectedEnemies = [];
	boardContainer.style.gridTemplateColumns = `repeat(${m}, 1fr)`;
	boardContainer.innerHTML = getblock(n, m);
	arrowLine = document.getElementById('arrowLine');
	let POS_00 = document.querySelector(`#board .cell[data-row="${0}"][data-col="${0}"]`).getBoundingClientRect();
	let POS_11 = document.querySelector(`#board .cell[data-row="${1}"][data-col="${1}"]`).getBoundingClientRect();
	distance = POS_11.left - POS_00.left;
	offset = POS_00.width / 2.0;
	footerMode = 'resume';
	resumedLevel = snap.level;
	renderFooterStatus();
	if (typeof toast === 'function') toast(gameText('game.resumed', { level: snap.level, turns: remain_turns }, '已从存档继续：第 ' + snap.level + ' 关，剩余 ' + remain_turns + ' 回合。'));
	snap.units.forEach((u, idx) => {
		const piece = document.createElement('div');
		piece.className = `chess chess--${u.color}`;
		piece.id = `piece-${piece_cnt}`;
		piece.innerHTML = (u.img
			? `<img src='./img/${u.img}.webp' style='width: 120%; height: 120%;' alt='' draggable='false' decoding='async'></img>`
			: `<p>${u.cls}</p>`);
		boardContainer.appendChild(piece);
		// 满血上限优先取本关配置的初始 LP（修复旧档缺 lpMax 时"上限=存档时当前血量"的老问题）
		const cfgLp = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME && CURRENT_GAME.pieces && CURRENT_GAME.pieces[idx])
			? CURRENT_GAME.pieces[idx].lp
			: null;
		const restoredMax = (cfgLp !== null) ? cfgLp : (u.lpMax || u.lp);
		const restoredLp = Math.min(u.lp, restoredMax);
		armys.push({
			id: piece.id,
			color: u.color,
			posx: u.posx, posy: u.posy,
			speed: u.speed,
			targetx: u.targetx, targety: u.targety,
			atkrange: u.atkrange, atk: u.atk, lp: restoredLp,
			lpMax: restoredMax,
			disabled: !!u.disabled,
			escaped: !!u.escaped,
			cls: u.cls, img: u.img || ''
		});
		updateUnitHealth(armys[armys.length - 1]);
		movePieceTo(piece.id, u.posx, u.posy);
		if (u.disabled) { piece.classList.add('disabled'); piece.style.display = 'none'; }
		piece_cnt ++;
	});
	refreshSelectedUI();
	refreshEnemySelectionUI();
	renderOrderArrows();
	renderBattleStatus();
	showLevelIntro();
}

/* 抓取当前这一局的中途状态（手动存档 / 自动存档都用它） */
function captureSnapshot() {
	if (typeof CURRENT_LEVEL_ID === 'undefined') return null;
	return {
		level: CURRENT_LEVEL_ID,
		n: n, m: m,
		remain_turns: remain_turns,
		momentum: battleMomentum,
		units: armys.map(u => ({
			color: u.color, cls: u.cls, img: u.img || '',
			posx: u.posx, posy: u.posy,
			targetx: u.targetx, targety: u.targety,
			speed: u.speed, atkrange: u.atkrange, atk: u.atk, lp: u.lp,
			lpMax: u.lpMax,   // 开局/读档时一定已按初始 LP 校准，无需兜底
			disabled: u.disabled,
			escaped: !!u.escaped
		}))
	};
}

/* 本关回退：只保存在内存中，最多使用 3 次，刷新或读档后重新计数。 */
function captureTurnState() {
	return {
		remainTurns: remain_turns,
		footerMode: footerMode,
		resumedLevel: resumedLevel,
		momentum: battleMomentum,
		units: armys.map(function (unit) { return Object.assign({}, unit); }),
		selectedIds: selectedPieces.map(function (unit) { return unit.id; }),
		selectedEnemyIds: selectedEnemies.map(function (unit) { return unit.id; }),
		game8: (typeof game8Started !== 'undefined') ? {
			started: game8Started,
			finished: game8Finished,
			breakthroughCount: game8BreakthroughCount
		} : null
	};
}

function undoText(key, vars, fallback) {
	return gameText(key, vars, fallback);
}

function renderUndoButton() {
	const button = document.getElementById('button-undo');
	if (!button) return;
	const left = Math.max(0, MAX_UNDO_USES - undoUses);
	button.textContent = undoText('game.undo', { left: left }, '回退 ' + left + '/3');
	button.title = undoText('game.undoTitle', null, '回退到上一步（本关最多使用 3 次）');
	button.disabled = left <= 0 || undoStack.length === 0;
}

function resetUndoHistory() {
	undoStack = [];
	undoUses = 0;
	renderUndoButton();
}

function rememberTurnForUndo() {
	if (undoUses >= MAX_UNDO_USES) return;
	undoStack.push(captureTurnState());
	if (undoStack.length > MAX_UNDO_USES) undoStack.shift();
	renderUndoButton();
}

function restoreBattleControlsAfterUndo() {
	document.body.classList.remove('result-active');
	boardContainer.style.removeProperty('display');
	buttonContainer.style.removeProperty('display');
	const footer = document.getElementById('footer-bar');
	if (footer) footer.style.removeProperty('display');
	const actions = document.getElementById('game-actions');
	if (actions) actions.style.removeProperty('display');
	const saveButtons = document.getElementById('save-load-btns');
	if (saveButtons) saveButtons.style.removeProperty('display');
	const exitButton = document.getElementById('button-exit');
	if (actions && exitButton && exitButton.parentNode !== actions) actions.appendChild(exitButton);
	['win', 'lose', '1star', '2star', '3star', 'button-next-game', 'button-replay', 'button-fail'].forEach(function (id) {
		const element = document.getElementById(id);
		if (element) element.style.display = 'none';
	});
	['deployment-panel', 'defense-line', 'defense-hud'].forEach(function (id) {
		const element = document.getElementById(id);
		if (element) element.style.removeProperty('display');
	});
}

function performUndo() {
	if (!undoStack.length || undoUses >= MAX_UNDO_USES) {
		if (typeof modalNotice === 'function') modalNotice(undoText('game.undoEmpty', null, '当前没有可以回退的步骤。'));
		return;
	}
	const state = undoStack.pop();
	remain_turns = state.remainTurns;
	footerMode = state.footerMode;
	resumedLevel = state.resumedLevel;
	battleMomentum = Math.max(0, Math.min(MAX_BATTLE_MOMENTUM, Number(state.momentum) || 0));
	state.units.forEach(function (saved, index) {
		const unit = armys[index];
		if (!unit) return;
		const id = unit.id;
		Object.assign(unit, saved);
		unit.id = id;
		const piece = document.getElementById(id);
		if (piece) {
			piece.style.removeProperty('display');
			piece.classList.toggle('disabled', !!unit.disabled);
			if (unit.disabled) piece.style.display = 'none';
		}
		movePieceTo(id, unit.posx, unit.posy);
		updateUnitHealth(unit);
	});
	selectedPieces = state.selectedIds.map(function (id) { return armys.find(function (unit) { return unit.id === id && !unit.disabled; }); }).filter(Boolean);
	selectedEnemies = state.selectedEnemyIds.map(function (id) { return armys.find(function (unit) { return unit.id === id && !unit.disabled; }); }).filter(Boolean);
	if (state.game8 && typeof game8Started !== 'undefined') {
		game8Started = state.game8.started;
		game8Finished = state.game8.finished;
		game8BreakthroughCount = state.game8.breakthroughCount;
		if (typeof game8UpdateBreakthroughTip === 'function') game8UpdateBreakthroughTip();
		if (typeof game8UpdateHUD === 'function') game8UpdateHUD();
	}
	undoUses += 1;
	restoreBattleControlsAfterUndo();
	if (typeof fxDebug !== 'undefined' && fxDebug && typeof fxDebug.clearAll === 'function') fxDebug.clearAll();
	renderFooterStatus();
	refreshSelectedUI();
	refreshEnemySelectionUI();
	renderInfoPanel();
	renderEnemyPanel();
	updateRangePositions();
	renderOrderArrows();
	renderUndoButton();
	renderBattleStatus();
	const left = Math.max(0, MAX_UNDO_USES - undoUses);
	if (typeof toast === 'function') toast(undoText('game.undoDone', { left: left }, '已回退一步，本关还可回退 ' + left + ' 次。'));
}

function ensureUndoButton() {
	if (document.getElementById('button-undo')) return;
	const actions = document.getElementById('game-actions');
	const exitButton = document.getElementById('button-exit');
	if (!actions || !exitButton) return;
	const button = document.createElement('button');
	button.id = 'button-undo';
	button.className = 'game-btn game-btn--undo';
	button.type = 'button';
	button.addEventListener('click', performUndo);
	actions.insertBefore(button, exitButton);
	renderUndoButton();
}

/* 当前登录用户（未登录返回 ''），依赖 account.js */
function currentUserSafe() {
	return (typeof currentUser === 'function') ? currentUser() : '';
}

/* 刷新关卡内"存档目标"下拉：a.save + 存档1/2/3，标注内容；跨关快照标注"非本关，不可读" */
function refreshSlotSelect() {
	const sel = document.getElementById('slot-select');
	if (!sel) return;
	sel.innerHTML = '';
	const user = currentUserSafe();
	const auto = user ? getAuto(user) : null;
	const lvl = (typeof CURRENT_LEVEL_ID === 'undefined') ? null : CURRENT_LEVEL_ID;
	function snapLabel(snap) {
		if (!snap) return null;
		if (snap.level === lvl) return gameText('save.sameLevel', { level: snap.level, turns: snap.remain_turns }, '（第 ' + snap.level + ' 关，剩 ' + snap.remain_turns + ' 回合）');
		return gameText('save.otherLevel', { level: snap.level, turns: snap.remain_turns }, '（第 ' + snap.level + ' 关 · 非本关，不可读）');
	}
	[AUTO_ID].concat(MANUAL_IDS).forEach(function (id) {
		const o = document.createElement('option');
		o.value = id;
		let extra = gameText('save.empty', null, '（空）');
		if (id === AUTO_ID) {
			if (auto && auto.snapshot) extra = snapLabel(auto.snapshot);
			else if (auto && (auto.unlocked > 1 || Object.keys(auto.stars).length)) extra = '';
		} else {
			const f = user ? getManual(user, id) : null;
			if (f && f.snapshot) extra = snapLabel(f.snapshot);
			else if (f && (f.unlocked > 1 || Object.keys(f.stars).length)) extra = '';
		}
		o.textContent = fileName(id) + extra;
		sel.appendChild(o);
	});
	sel.value = AUTO_ID;
}
refreshSlotSelect();
ensureUndoButton();

/* 验收/调试用：控制台向某目标存中途快照（默认 a.save），或清空当前用户全部存档 */
window.__saveMidLevel = function (id) {
	if (typeof CURRENT_LEVEL_ID === 'undefined') { console.log('[__saveMidLevel] 不在关卡内'); return; }
	const user = currentUserSafe();
	if (!user) { console.log('[__saveMidLevel] 未登录'); return; }
	id = isFileId(id) ? String(id) : AUTO_ID;
	const snap = captureSnapshot();
	if (!snap) return;
	const ok = (id === AUTO_ID) ? saveSnapshotToAuto(user, snap) : saveToManual(user, id, snap);
	if (ok) { console.log('[__saveMidLevel] 已保存到 ' + fileName(id)); refreshSlotSelect(); }
};

window.__clearSave = function () {
	const user = currentUserSafe();
	if (user) {
		localStorage.removeItem('a.save:' + user);
		MANUAL_IDS.forEach(function (id) { localStorage.removeItem('save' + id + ':' + user); });
	}
	console.log('[__clearSave] 当前用户的自动存档与手动存档已清空');
};

/* 胜负结算后隐藏"存/读档"与左右显示条（Menu 按钮保留，方便直接退出） */
function hideMidGameControls() {
	const el = document.getElementById('save-load-btns');
	if (el) el.style.display = 'none';
	const bar = document.getElementById('info-bar');
	if (bar) bar.style.display = 'none';
	const ebar = document.getElementById('enemy-info');
	if (ebar) ebar.style.display = 'none';
	const rl = document.getElementById('range-layer');
	if (rl) rl.remove();
	rangeCircles = [];
}

/* 结算页（2026-09）：把 Menu 按钮也并进 #result-area，跟胜负面板一起居中。
   判胜时整条 #game-actions 本来就是隐藏的，所以只在判负分支里调动。 */
function moveMenuIntoResultArea() {
	const area = document.getElementById('result-area');
	const btn = document.getElementById('button-exit');
	if (area && btn && btn.parentNode !== area) area.appendChild(btn);
}

/* 通关结算页的"下一步去哪"（写在 #button-next-game 的 data-target 上）：
   · 下一关是结局页 → 直接进结局（第 7 关单独判：隐藏关通关去隐藏结局）；
   · 否则回主界面，**只有这一关通关真的解锁了新关卡**时才带 ?unlock=N
     —— 主界面靠它播"路线加载"动画并弹出新标记（见 js/menu-saves.js 的 revealId）。
     重打已经通过的老关卡时战线没有前移，就不该再播一次动画。
   注意：必须在 autosaveOnWin() 之前调用，否则读到的 unlocked 已经是推进后的值。 */
function winTargetFor(levelId) {
	if (Number(levelId) === 7) return 'hidden-end.html';   // 隐藏关通关 → 隐藏结局
	if (typeof nextLevelFile === 'function') {
		const nf = nextLevelFile(levelId);
		if (/end-game\.html|hidden-end\.html/.test(nf)) return nf;
	}
	let prevUnlocked = 1;
	try {
		if (typeof currentUser === 'function' && currentUser() && typeof autoProgress === 'function') {
			prevUnlocked = Number(autoProgress(currentUser()).unlocked) || 1;
		}
	} catch (e) { /* 读不到就当作"推进了"，宁可多播一次动画 */ }
	const advanced = Number(levelId) >= prevUnlocked;   // 打的是战线最前沿那一关
	return 'menu.html' + (advanced ? ('?unlock=' + levelId) : '');
}

/* 通关结算页统一收尾：只留 Next —— 隐藏 Replay / 结局按钮与整条操作区（含 Menu） */
function hideResultAlternatives() {
	const replay = document.getElementById('button-replay');
	if (replay) replay.style.display = 'none';
	const fail = document.getElementById('button-fail');
	if (fail) fail.style.display = 'none';
	const actions = document.getElementById('game-actions');
	if (actions) actions.style.display = 'none';
}

/* 向量归一化，方便计算棋子移动到的位置 */
function normalize(vec) {
	const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
	if(length <= eps) { return {x: 0.0, y: 0.0}; }
	return {
		x: vec.x / length,
		y: vec.y / length
	} ;
}

/* 将棋子的状态设为不能使用的状态的方法 */
function setToDisable(element) {
	element.disabled = true;
	element.lp = Math.max(0, Number(element.lp) || 0);
	const piece = document.getElementById(element.id);
	piece.classList.add('disabled');
	updateUnitHealth(element);
}

/* 计算棋子间距离的方法 */
function calcdis(element1, element2) {
	let disx = element1.posx - element2.posx, disy = element1.posy - element2.posy;
	return Math.sqrt(disx * disx + disy * disy) ;
}

/* 近战单位的接战距离略大于棋子直径，避免为了开火而彼此叠在一起。 */
function unitCombatRange(unit) {
	return Math.max(Number(unit && unit.atkrange) || 0, UNIT_MIN_SEPARATION + 0.02);
}

function isUnitPositionClear(unit, x, y) {
	return armys.every(function (other) {
		if (other === unit || other.disabled) return true;
		const dx = x - other.posx;
		const dy = y - other.posy;
		return Math.sqrt(dx * dx + dy * dy) >= UNIT_MIN_SEPARATION - eps;
	});
}

/* 目标点被占用时依次尝试左右绕行；全部受阻就停在原位，绝不穿过或堆叠。 */
function collisionSafeMove(unit, startx, starty, desiredx, desiredy) {
	if (isUnitPositionClear(unit, desiredx, desiredy)) return { x: desiredx, y: desiredy };
	const dx = desiredx - startx;
	const dy = desiredy - starty;
	const length = Math.sqrt(dx * dx + dy * dy);
	if (length <= eps) return { x: startx, y: starty };
	const ux = dx / length;
	const uy = dy / length;
	const angles = [55, -55, 90, -90];
	for (let i = 0; i < angles.length; i++) {
		const rad = angles[i] * Math.PI / 180;
		const vx = ux * Math.cos(rad) - uy * Math.sin(rad);
		const vy = ux * Math.sin(rad) + uy * Math.cos(rad);
		const candidate = { x: startx + vx * length, y: starty + vy * length };
		if (isUnitPositionClear(unit, candidate.x, candidate.y)) return candidate;
	}
	return { x: startx, y: starty };
}

/* 从 armys 中选出距离 element 最近的异色棋子的方法，用于确认棋子攻击目标 */
function selectMinimalDistance(element, armys) {
	let minDisItem = null, minDis = 200.0;
	for(let i = 0; i < armys.length; ++ i) {
		if(armys[i].disabled) continue ;
		if(armys[i].color == element.color) continue ;
		let dis = calcdis(element, armys[i]);
		if(dis < minDis) {
			minDisItem = armys[i]; minDis = dis;
		}
	}
	return minDisItem;
}

/* 将一个回合分成若干'帧'，每一'帧'分别处理 */
/* 若当前回合棋子攻击范围内有敌人，则攻击最近的敌人 */
/* 否则随机攻击 */
// =====================================================
// 找出“这一小段移动路径”第一次进入哪个敌人的攻击范围
//
// 返回：
// {
//     enemy: 敌人,
//     t: 0~1，表示沿着本次移动路径走了多少
// }
// 如果没有进入任何新的攻击范围，则返回 null
// =====================================================
function findFirstEnterAttackRange(element, startx, starty, endx, endy) {

    let first = null;

    const dx = endx - startx;
    const dy = endy - starty;
    const a = dx * dx + dy * dy;

    if (a <= eps) return null;

    for (let i = 0; i < armys.length; ++i) {

        let enemy = armys[i];

        // 死亡单位跳过
        if (enemy.disabled) continue;

        // 自己和同阵营跳过
        if (enemy.color === element.color) continue;

        // -----------------------------------------
        // 如果移动开始时已经在这个敌人的攻击范围内
        // 那么这次不把“离开它”当作进入
        // -----------------------------------------
        const sx = startx - enemy.posx;
        const sy = starty - enemy.posy;

        const startDis2 = sx * sx + sy * sy;
        const range = unitCombatRange(element);

        if (startDis2 <= range * range + eps) {
            continue;
        }

        // -----------------------------------------
        // 求线段与攻击范围圆的第一次交点
        // 圆心 = enemy
        // 半径 = element.atkrange
        // -----------------------------------------
        const fx = startx - enemy.posx;
        const fy = starty - enemy.posy;

        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - range * range;

        const discriminant = b * b - 4 * a * c;

        // 没有交点
        if (discriminant < 0) continue;

        const sqrtD = Math.sqrt(discriminant);

        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);

        // 我们从圆外往圆内走，
        // 所以第一次进入圆的是较小的有效 t
        let t = null;

        if (t1 >= -eps && t1 <= 1 + eps) {
            t = t1;
        } else if (t2 >= -eps && t2 <= 1 + eps) {
            t = t2;
        }

        if (t === null) continue;

        t = Math.max(0, Math.min(1, t));

        if (first === null || t < first.t) {
            first = {
                enemy: enemy,
                t: t
            };
        }
    }

    return first;
}

function nextStep() {
	let disabledList = new Array();

	armys.forEach(element => {
		if(element.disabled == true) return;

		let atktar = selectMinimalDistance(element, armys);

		// ============================================
		// 先判断当前位置是否在最近敌人的攻击范围内
		// ============================================

		let inAttackRange = false;

		if(atktar != null) {
			inAttackRange = calcdis(element, atktar) < unitCombatRange(element);
		}

		// ============================================
		// 计算当前目标方向
		// ============================================

		let targetvector = normalize({
			x: element.targetx - element.posx,
			y: element.targety - element.posy
		});

		// ============================================
		// 判断是否已经到达目标
		// ============================================

		if(
			Math.abs(element.targetx - element.posx) <= eps &&
			Math.abs(element.targety - element.posy) <= eps
		) {
			// 已经到达目标，如果在攻击范围内，就攻击
			if(inAttackRange) {
				atktar.lp -= battleAttackPower(element);
				updateUnitHealth(atktar);
				if (typeof fxMarkFired === 'function') fxMarkFired(element, atktar);

				if(atktar.lp <= 0)
					disabledList.push(atktar);
			}

			return;
		}

		// ============================================
		// 如果目前在攻击范围内
		// 判断移动方向是不是在“离开敌人”
		// ============================================

		if(inAttackRange) {

			// 从当前点指向目标点
			let moveX = element.targetx - element.posx;
			let moveY = element.targety - element.posy;

			// 当前棋子指向敌人的向量
			let enemyX = atktar.posx - element.posx;
			let enemyY = atktar.posy - element.posy;

			// 点积
			let dot = moveX * enemyX + moveY * enemyY;

			// dot < 0：
			// 移动方向与“指向敌人”的方向相反
			// 也就是正在远离敌人
			if(dot >= 0) {
				// 正在靠近敌人/没有离开
				// 保持原来的攻击逻辑
				atktar.lp -= battleAttackPower(element);
				updateUnitHealth(atktar);
				if (typeof fxMarkFired === 'function') fxMarkFired(element, atktar);

				if(atktar.lp <= 0)
					disabledList.push(atktar);

				return;
			}

			// dot < 0
			// 正在离开敌人
			// 不攻击，继续往外走
		}

		// ============================================
		// 按照原来的逻辑移动一步
		// ============================================

		const startx = element.posx;
		const starty = element.posy;
		const remainingX = element.targetx - startx;
		const remainingY = element.targety - starty;
		const remaining = Math.sqrt(remainingX * remainingX + remainingY * remainingY);
		const travel = Math.min(Math.max(Number(element.speed) || 0, 0), remaining);
		const desiredx = startx + targetvector.x * travel;
		const desiredy = starty + targetvector.y * travel;
		const safe = collisionSafeMove(element, startx, starty, desiredx, desiredy);
		element.posx = safe.x;
		element.posy = safe.y;

		if (Math.abs(element.posx - startx) > eps || Math.abs(element.posy - starty) > eps) {
			movePieceTo(element.id, element.posx, element.posy);
			if (typeof fxMarkMoving === 'function') fxMarkMoving(element, startx, starty);
		}
	});

	// ============================================
	// 统一处理死亡单位
	// ============================================

	disabledList.forEach(element => {
		setToDisable(element);
	});
}


/* 将灰色的濒死棋子移除 */
function clearDisable() {
	armys.forEach(element => {
		if(element.disabled == true) {
			const piece = document.getElementById(element.id);
			piece.style.display = 'none' ;
			return ;
		}
	});
}

/* 检查胜负状态 */
/* to-do 收尾：追猎战（第 4 关）——红方"到达右上角"才算成功撤退（右边界与上边界同时满足，标记 escaped 并移出棋盘） */
function processTurnEscapes() {
	const obj = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME && CURRENT_GAME.objective &&
		CURRENT_GAME.objective.type === 'retreat') ? CURRENT_GAME.objective : null;
	if (!obj) return;
	const exitX = (obj.exitX !== undefined) ? obj.exitX : 9.5;
	const exitY = (obj.exitY !== undefined) ? obj.exitY : -0.5;
	armys.forEach(u => {
		if (u.color !== 'red' || u.disabled || u.escaped) return;
		if (u.posx >= exitX && u.posy <= exitY) {
			console.log(`${u.id} is escaped!`);
			u.escaped = true;
			u.disabled = true;
			const el = document.getElementById(u.id);
			if (el) el.style.display = 'none';
		}
	});
}


/* 结算页上的通关提示文字（2026-09：替代通关 alert；由 save.js 的 autosaveOnWin 调用） */
function showWinNote(text) {
	var win = document.getElementById('win');
	if (!win) return;
	var note = document.getElementById('win-note');
	if (!note) {
		note = document.createElement('p');
		note.id = 'win-note';
		note.className = 'win-note';
		win.appendChild(note);
	}
	note.textContent = text;
}

function showWinResult() {
	const win = document.getElementById('win');
	const next = document.getElementById('button-next-game');
	if (!win || !next) return;
	document.body.classList.add('result-active');
	win.style.cssText = 'display:flex; flex-direction:column; align-items:center;';
	next.style.cssText = 'display:inline-flex;';
	/* 让按钮成为战果卡片的一部分，与卡片一起在页面中央显示。 */
	if (next.parentNode !== win) win.appendChild(next);
	if (typeof applyUiTranslations === 'function') applyUiTranslations(win);
	next.focus();
}

function victoryReportText(star, saveResult) {
	const result = saveResult || { saved: false, openedHidden: false };
	let saveMessage = result.saved
		? gameText('victory.saved', null, '战果已自动保存到 a.save。')
		: gameText('victory.notSaved', null, '当前未登录，本次战果没有写入存档。');
	if (result.openedHidden) saveMessage += ' ' + gameText('victory.hidden', null, '历史出现了新的岔路：秘密路线已经开启。');
	return gameText('victory.summary', {
		level: (typeof CURRENT_LEVEL_ID === 'undefined' ? '?' : CURRENT_LEVEL_ID),
		stars: star,
		save: saveMessage
	}, '本关战斗结束：本次获得 ' + star + ' 星。' + saveMessage);
}

/* 通关使用与开场相同的对话引擎，避免浏览器顶部 alert。 */
function showVictoryDialogue(star, saveResult) {
	const meta = (typeof getLevelById === 'function' && typeof CURRENT_LEVEL_ID !== 'undefined')
		? getLevelById(CURRENT_LEVEL_ID)
		: null;
	const lines = [
		{
			who: '拿破仑', role: '法兰西皇帝', side: 'left',
			portrait: 'img/portraits/napoleon.webp',
			chapter: meta ? meta.chapter : '帝国战记', location: meta ? meta.location : '', scene: meta ? meta.scene : 'campaign',
			text: function () { return gameText('victory.napoleon', null, '敌军已经退出战场。收拢队伍，把鹰旗带到下一条战线。'); }
		},
		{
			who: function () { return gameText('victory.reporter', null, '战报'); },
			role: function () { return gameText('victory.role', null, '帝国统帅部'); },
			kind: 'briefing', chapter: meta ? meta.chapter : '帝国战记', location: meta ? meta.location : '', scene: meta ? meta.scene : 'campaign',
			text: function () { return victoryReportText(star, saveResult); },
			actionLabel: function () { return gameText('victory.viewResult', null, '查看战果'); }
		}
	];
	if (typeof playDialogue === 'function') playDialogue(lines, showWinResult);
	else showWinResult();
}

/* 三类关卡的胜利分支共用一个收尾，防止存档、成就和提示重复执行。 */
function completeVictory(star, quickL1) {
	const win = document.getElementById('win');
	const next = document.getElementById('button-next-game');
	if (win) win.style.display = 'none';
	if (next) {
		next.style.display = 'none';
		if (typeof CURRENT_LEVEL_ID !== 'undefined') next.dataset.target = winTargetFor(CURRENT_LEVEL_ID);
	}
	document.body.classList.remove('result-active');
	hideResultAlternatives();
	let saveResult = { saved: false, openedHidden: false };
	if (typeof autosaveOnWin === 'function' && typeof CURRENT_LEVEL_ID !== 'undefined') {
		saveResult = autosaveOnWin(CURRENT_LEVEL_ID, star, !!quickL1) || saveResult;
	}
	if (typeof tryThreeStarAchievement === 'function' && typeof CURRENT_LEVEL_ID !== 'undefined') {
		tryThreeStarAchievement(CURRENT_LEVEL_ID, star);
	}
	hideMidGameControls();
	showVictoryDialogue(star, saveResult);
}
function checkWinState() {
	-- remain_turns;
	let redc = 0, bluec = 0;

	armys.forEach(element => {
		if(element.disabled == false) {
			if(element.color == 'red') ++ redc;
			if(element.color == 'blue') ++ bluec;
		}
	});

	/* =========================================================
	 * Game5（2026-09 起：这场攻城战由第 5 关承载，与第 6 关整体对调）：滑铁卢·限时攻坚
	 *
	 * 按通关所用步数评星：
	 * ≤13 步：3 星
	 * 14~15 步：2 星
	 * 16~18 步：1 星
	 *
	 * 回合超过 18 步仍未消灭全部红军：失败
	 * ========================================================= */

	if(typeof CURRENT_LEVEL_ID !== 'undefined' && CURRENT_LEVEL_ID === 5) {

		const usedTurns = CURRENT_GAME.turns_limit - remain_turns;

		/* =========================
		 * 情况1：红军全部被消灭
		 * ========================= */
		if(redc === 0) {

			boardContainer.style.display = 'none';
			buttonContainer.style = 'display: none;';
			document.getElementById('footer-bar').style = 'display: none';

			/* 根据通关步数计算星级 */
			let star;

			if(usedTurns <= 13) {
				star = 3;
			}
			else if(usedTurns <= 15) {
				star = 2;
			}
			else {
				star = 1;
			}

			/* 显示星星 */
			if(star === 1) {
				const winState = document.getElementById('1star');
				if(winState) winState.style.display = '';
			}
			else if(star === 2) {
				const winState = document.getElementById('2star');
				if(winState) winState.style.display = '';
			}
			else {
				const winState = document.getElementById('3star');
				if(winState) winState.style.display = '';
			}

			completeVictory(star, false);

			return;
		}

		/* =========================
		 * 情况2：我军全部阵亡
		 * ========================= */
		if(bluec === 0) {

			boardContainer.style.display = 'none';
			buttonContainer.style = 'display: none;';

			document.getElementById('footer-bar').style = 'display: none';

			document.getElementById('lose').style =
				'display: flex; flex-direction: column; align-items: center;';

			document.getElementById('button-replay').style =
				'width: 100px; height: 50px;';

			moveMenuIntoResultArea();

			const tip = document.getElementById('loseTips');

			if(tip) {
				tip.style = '';
				tip.innerHTML = '我军全部阵亡，滑铁卢攻坚失败。';
			}

			hideMidGameControls();

			return;
		}

		/* =========================
		 * 情况3：18步结束仍未消灭红军
		 * ========================= */
		if(remain_turns <= 0) {

			boardContainer.style.display = 'none';
			buttonContainer.style = 'display: none;';

			document.getElementById('footer-bar').style = 'display: none';

			document.getElementById('lose').style =
				'display: flex; flex-direction: column; align-items: center;';

			document.getElementById('button-replay').style =
				'width: 100px; height: 50px;';

			moveMenuIntoResultArea();

			const tip = document.getElementById('loseTips');

			if(tip) {
				tip.style = '';
				tip.innerHTML =
					'18回合已经结束，仍有 ' +
					redc +
					' 支敌军存活，攻坚失败。';
			}

			if(
				typeof recordLevelFail === 'function' &&
				typeof CURRENT_LEVEL_ID !== 'undefined'
			) {
				recordLevelFail(CURRENT_LEVEL_ID);
			}

			hideMidGameControls();

			return;
		}

		/* =========================
		 * Game5 尚未结束
		 * ========================= */
		const footer = document.getElementById('footer-bar');

		if(footer) {
			footer.innerHTML =
				'You have ' +
				remain_turns +
				' turns left. ' +
				'Used: ' +
				usedTurns +
				' turns.';
		}

		return;
	}

	// 计算红蓝色棋子数量


	/* ============================================================
	 * Game8 新增：红线拦截战
	 *
	 * 这里只新增，不删除也不修改原来的 defense 逻辑。
	 *
	 * 规则：
	 *   0 个敌军突破红线 -> 3 星
	 *   1~2 个敌军突破   -> 2 星
	 *   3~4 个敌军突破   -> 1 星
	 *   5 个及以上突破   -> 失败
	 *
	 * 突破的敌军使用 escaped 标记统计。
	 * ============================================================ */

	const lineDefenseObj =
		(typeof CURRENT_GAME !== 'undefined' &&
		 CURRENT_GAME &&
		 CURRENT_GAME.objective &&
		 CURRENT_GAME.objective.type === 'line_defense')
			? CURRENT_GAME.objective
			: null;

	if(lineDefenseObj) {

		/*
		 * 当前已经突破红线的敌军数量
		 *
		 * 注意：
		 * 突破的敌军已经 disabled，
		 * 因此不能通过 redc 统计，
		 * 必须通过 escaped 统计。
		 */
		const breakthroughCount =
			armys.filter(function(u) {
				return u.color === 'red' && !!u.escaped;
			}).length;


		const loseEscape =
			lineDefenseObj.loseEscape !== undefined
				? lineDefenseObj.loseEscape
				: 5;


		/* ========================================
		 * 情况1：
		 * 敌军突破人数达到失败阈值
		 * ======================================== */

		if(breakthroughCount >= loseEscape) {

			boardContainer.style.display = 'none';

			buttonContainer.style = 'display: none;';

			document.getElementById('footer-bar').style =
				'display: none';

			document.getElementById('lose').style =
				'display: flex; flex-direction: column; align-items: center;';

			document.getElementById('button-replay').style =
				'width: 100px; height: 50px;';

			moveMenuIntoResultArea();


			const failBtn =
				document.getElementById('button-fail');

			if(failBtn) {

				failBtn.style.cssText =
					'width:auto; margin-top:8px;';

				if(CURRENT_LEVEL_ID === 7) {

					failBtn.dataset.target =
						'destiny-fail.html';

					failBtn.textContent =
						'View Ending: Destined to fail';

				} else {

					failBtn.dataset.target =
						'fail.html';

					failBtn.textContent =
						'View Ending: Early Defeat';
				}
			}


			if(
				typeof recordLevelFail === 'function' &&
				typeof CURRENT_LEVEL_ID !== 'undefined'
			) {

				recordLevelFail(CURRENT_LEVEL_ID);
			}


			const tip =
				document.getElementById('loseTips');

			if(tip) {

				tip.style = '';

				tip.innerHTML =
					'防线已经失守！共有 ' +
					breakthroughCount +
					' 支敌军突破红线。';
			}


			hideMidGameControls();

			return;
		}


		/* ========================================
		 * 情况2：
		 * 我军全部阵亡
		 * ======================================== */

		if(bluec === 0) {

			boardContainer.style.display = 'none';

			buttonContainer.style = 'display: none;';

			document.getElementById('footer-bar').style =
				'display: none';

			document.getElementById('lose').style =
				'display: flex; flex-direction: column; align-items: center;';


			const tip =
				document.getElementById('loseTips');

			if(tip) {

				tip.style = '';

				tip.innerHTML =
					'最后防线已经失守，我军全部阵亡。';
			}


			hideMidGameControls();

			return;
		}


		/* ========================================
		 * 情况3：
		 * 12 回合结束
		 *
		 * 注意：
		 * checkWinState() 开头已经执行：
		 *
		 *     --remain_turns;
		 *
		 * 所以这里使用 <= 0。
		 * ======================================== */

		if(remain_turns <= 0) {

			boardContainer.style.display = 'none';

			buttonContainer.style = 'display: none;';

			document.getElementById('footer-bar').style =
				'display: none';

			/* 根据突破人数计算星级 */

			let star;

			if(breakthroughCount === 0) {

				star = 3;

			} else if(breakthroughCount <= 2) {

				star = 2;

			} else {

				star = 1;
			}


			/* 显示星星 */

			if(star === 1) {

				const winState =
					document.getElementById('1star');

				if(winState) {
					winState.style.display = '';
				}

			} else if(star === 2) {

				const winState =
					document.getElementById('2star');

				if(winState) {
					winState.style.display = '';
				}

			} else {

				const winState =
					document.getElementById('3star');

				if(winState) {
					winState.style.display = '';
				}
			}


			/* Game8 如果存在专用结算文字 */

			const defenseStars =
				document.getElementById('defense-stars');

			if(defenseStars) {

				if(star === 3) {

					defenseStars.innerText =
						'★★★';

				} else if(star === 2) {

					defenseStars.innerText =
						'★★☆';

				} else {

					defenseStars.innerText =
						'★☆☆';
				}
			}


			const winDetail =
				document.getElementById('win-detail');

			if(winDetail) {

				winDetail.innerText =
					'防守成功！共有 ' +
					breakthroughCount +
					' 支敌军突破红线。';
			}


			/* 保持原有存档逻辑 */

			const usedTurns =
				(typeof CURRENT_GAME !== 'undefined' &&
				 CURRENT_GAME &&
				 CURRENT_GAME.turns_limit)
					? CURRENT_GAME.turns_limit - remain_turns
					: 99;

			const quickL1 =
				usedTurns <= 12;


			completeVictory(star, quickL1);

			return;
		}


		/* ========================================
		 * Game8 尚未结束
		 * ======================================== */

		const footer =
			document.getElementById('footer-bar');

		if(footer) {

			footer.innerHTML =
				'守住最后防线！剩余 ' +
				remain_turns +
				' 回合 · 已突破 ' +
				breakthroughCount +
				' 人。';
		}


		/*
		 * 非常重要：
		 * Game8 到这里直接 return。
		 *
		 * 这样下面原本属于其他关卡的
		 * redc / retreat / remain_turns
		 * 判断不会干扰 Game8。
		 */

		return;
	}


	/* =========================================================
	 * 以下全部保持原来的 Game1~Game7 代码
	 * ========================================================= */

	// 追逐战（第 4 关）特殊结算：按"逃脱数"给星；逃脱≥loseEscape 判负
	const retreatObj = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME && CURRENT_GAME.objective &&
		CURRENT_GAME.objective.type === 'retreat') ? CURRENT_GAME.objective : null;
	const retreat = !!retreatObj;
	const retreatLose = retreatObj ? (retreatObj.loseEscape || 3) : 99;
	const escaped = armys.filter(u => u.color === 'red' && !!u.escaped).length;

	if(redc == 0 && !(retreat && escaped >= retreatLose)) {
		// 没有红棋则获胜，根据剩余蓝棋数量给出星级（追逐战按逃脱数）
		boardContainer.style.display = 'none';
		buttonContainer.style = 'display: none;';
		document.getElementById('footer-bar').style = 'display: none';
		// 加载胜利界面
		const star = retreat ? [3, 2, 1][Math.min(escaped, 2)] : ((bluec == 0) ? 1 : (bluec == 1) ? 2 : 3);
		if(star == 1) {
			const winState = document.getElementById('1star');
			winState.style.display = '' ;
		} else if(star == 2) {
			const winState = document.getElementById('2star');
			winState.style.display = '' ;
		} else {
			const winState = document.getElementById('3star');
			winState.style.display = '' ;
		}
		// 通关自动存档（to-do #2/#3/#14）：记星级、解锁下一关、清掉快照；第 1 关 ≤12 回合通关开隐藏路线
		const usedTurns = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME && CURRENT_GAME.turns_limit)
			? CURRENT_GAME.turns_limit - remain_turns
			: 99;
		const quickL1 = usedTurns <= 12;
		completeVictory(star, quickL1);
		return ;
	}

	if((retreat && escaped >= retreatLose) || bluec == 0 || remain_turns == 0) {
		// 追逐战逃脱数超限 / 蓝方全灭 / 回合耗尽：判负
		boardContainer.style.display = 'none';
		buttonContainer.style = 'display: none;';
		document.getElementById('lose').style = 'display: flex; flex-direction: column; align-items: center;' ;
		document.getElementById('footer-bar').style = 'display: none';
		document.getElementById('button-replay').style = 'width: 100px; height: 50px;';
		moveMenuIntoResultArea();
		const failBtn = document.getElementById('button-fail');
		if (failBtn) {
			failBtn.style.cssText = 'width:auto; margin-top:8px;';
			if (CURRENT_LEVEL_ID === 7) {
				// 隐藏第 7 关的失败有专属结局：命运无法改变
				failBtn.dataset.target = 'destiny-fail.html';
				failBtn.dataset.i18n = 'game.endingDestiny';
				failBtn.textContent = gameText('game.endingDestiny', null, '查看结局：命运无法改变');
			} else {
				failBtn.dataset.target = 'fail.html';
				failBtn.dataset.i18n = 'game.endingEarly';
				failBtn.textContent = gameText('game.endingEarly', null, '查看结局：提早失利');
			}
		}
		// to-do #15：记录同关连续失败次数
		if (typeof recordLevelFail === 'function' && typeof CURRENT_LEVEL_ID !== 'undefined') {
			recordLevelFail(CURRENT_LEVEL_ID);
		}
		let tip = loseTips[Math.floor(Math.random() * loseTips.length)]
		if (CURRENT_LEVEL_ID === 7) tip = '……帝国第二次折戟于此，命运没有给历史第二次机会。';
		document.getElementById('loseTips').style = '';
		document.getElementById('loseTips').dataset.sourceText = tip;
		document.getElementById('loseTips').textContent = gameContent(tip);
		hideMidGameControls();
		return ;
	}

	footerMode = 'turn';
	renderFooterStatus();
	/* 加载剩余回合数 */
}

buttonContainer.addEventListener('click', function() {
	rememberTurnForUndo();
	const redCountBefore = aliveUnitCount('red');
	const positionsBefore = armys.map(function (unit) {
		return { id: unit.id, x: unit.posx, y: unit.posy };
	});
	// 点击按钮时推进 24 '帧'
	clearDisable();

	// to-do #9：回合开始前按关卡策略给红方重设一次方向（一回合内不再变）
	if (typeof applyEnemyAI === 'function') {
		applyEnemyAI();
	}

	const movingCounts = 24;

	for(let i = 0; i < movingCounts; ++ i) {

		nextStep();

		processTurnEscapes();

		/*
		 * ====================================================
		 * Game8 新增：
		 * 每一帧检查红军是否已经越过红线
		 *
		 * Game8 中由 game8.js 提供
		 * processLineBreakthroughs()
		 * ====================================================
		 */
		if(typeof processLineBreakthroughs === 'function') {
			processLineBreakthroughs();
		}
	}
	// 开火特效（2026-09）：24 帧结算完后，给本回合开过火的单位统一生成烟雾 / 枪口火光
	if (typeof fxFlush === 'function') fxFlush();
	const anyUnitMoved = positionsBefore.some(function (before) {
		const unit = armys.find(function (item) { return item.id === before.id; });
		return unit && (Math.abs(unit.posx - before.x) > eps || Math.abs(unit.posy - before.y) > eps);
	});
	const redDefeatedThisTurn = Math.max(0, redCountBefore - aliveUnitCount('red'));
	updateBattleMomentum(redDefeatedThisTurn);

	// 防止误触造成多次触发
	// 测试时会注释，发布时记得删去
	this.disabled = true;
	setTimeout(() => {this.disabled = false;}, 300);

	checkWinState();

	renderInfoPanel();
	renderEnemyPanel();
	updateRangePositions();
	renderOrderArrows();
	renderUndoButton();
	renderBattleStatus();
	if (!anyUnitMoved && boardContainer.style.display !== 'none') {
		const message = gameText('game.noMovement', null, '本回合没有任何部队机动。请先下达移动命令，或确认双方已经进入交火。');
		if (typeof modalNotice === 'function') modalNotice(message);
		else if (typeof toast === 'function') toast(message);
	}
});

/* ========== to-do #4：选中集合 + 画框多选 ========== */
let selectedPieces = new Array();        // 当前选中的（蓝方）军队，元素为 armys 里的对象
const selectionListeners = new Array();  // #5 左侧显示条等可挂监听，选中变化时收到通知

function getSelection() { return selectedPieces; }

function addSelectionListener(fn) {
	selectionListeners.push(fn);
}

function fireSelectionChanged() {
	selectionListeners.forEach(fn => {
		try {
			fn();
		} catch (e) {
			/* 忽略单个监听器的错误 */
		}
	});
}

// 按当前选中集合刷新所有棋子的高亮
function refreshSelectedUI() {
	clearHoverMatches();
	document.querySelectorAll('.chess.selected').forEach(el => el.classList.remove('selected'));
	selectedPieces.forEach(p => {
		const el = document.getElementById(p.id);
		if (el) el.classList.add('selected');
	});
	/* 选中集合改变时终止上一条鼠标预览；下一次移动鼠标会从新选中的部队
	 * 展开一条完整军令箭头，避免旧箭头残留在棋盘上。 */
	if (typeof clearOrderPreview === 'function') clearOrderPreview();
	if (boardContainer) boardContainer.classList.toggle('is-order-aiming', selectedPieces.length > 0);
	fireSelectionChanged();
}

function clearSelection() {
	selectedPieces = [];
	refreshSelectedUI();
}

function selectOnly(pieceData) {
	selectedPieces = [pieceData];
	refreshSelectedUI();
}

function toggleSelect(pieceData) {
	const i = selectedPieces.indexOf(pieceData);
	if (i >= 0) selectedPieces.splice(i, 1);
	else selectedPieces.push(pieceData);
	refreshSelectedUI();
}

function selectMany(list) {
	selectedPieces = list.slice();
	refreshSelectedUI();
}

function removeFromSelection(pieceData) {
	const i = selectedPieces.indexOf(pieceData);
	if (i >= 0) selectedPieces.splice(i, 1);
	refreshSelectedUI();
}

function isAliveBlue(pieceData) {
	return !!pieceData && pieceData.color === 'blue' && !pieceData.disabled;
}

// 给当前所有选中军队下令移动到 (targetX, targetY)（格坐标）。
// 下令后清空选中：避免残留选中导致再次渲染预览箭头（常驻蓝色箭头仍保留，它与选中无关）
function issueMoveTo(targetX, targetY) {
	selectedPieces.forEach(p => {
		p.targetx = targetX;
		p.targety = targetY;
	});

	hideArrow();
	clearOrderPreview();
	clearSelection();
	renderOrderArrows();   // to-do #11：常驻指示箭头随之更新
}

/* ---------- 鼠标交互：单击选棋 / 点空地移动 / 拖拽画框多选 ---------- */
let dragBoxState = null;   // { x0, y0, pieceEl, moved }

function getBoxEl() {
	let el = document.getElementById('boxSel');
	if (!el) {
		el = document.createElement('div');
		el.id = 'boxSel';
		boardContainer.appendChild(el);
	}
	return el;
}

function hideBox() {
	const el = document.getElementById('boxSel');
	if (el) el.style.display = 'none';
}

function updateBox(x1, y1) {
	const rect = boardContentRect();
	const el = getBoxEl();
	const left = Math.min(dragBoxState.x0, x1) - rect.left;
	const top = Math.min(dragBoxState.y0, y1) - rect.top;
	const right = Math.max(dragBoxState.x0, x1) - rect.left;
	const bottom = Math.max(dragBoxState.y0, y1) - rect.top;
	el.style.left = left + 'px';
	el.style.top = top + 'px';
	el.style.width = (right - left) + 'px';
	el.style.height = (bottom - top) + 'px';
	el.style.display = 'block';
}

boardContainer.addEventListener('mousedown', function (e) {
	if (e.button !== 0 || dragBoxState) return;
	dragBoxState = {
		x0: e.clientX,
		y0: e.clientY,
		pieceEl: e.target.closest('.chess') || null,
		moved: false
	};
	hideArrow();
});

boardContainer.addEventListener('mousemove', function (e) {
	if (dragBoxState) {
		const dx = e.clientX - dragBoxState.x0, dy = e.clientY - dragBoxState.y0;
		if (!dragBoxState.moved && dx * dx + dy * dy > 25) {
			dragBoxState.moved = true;
		}

		if (dragBoxState.moved) {
			updateBox(e.clientX, e.clientY);
		}

		return;
	}

	// 非拖拽：给"当前所有已选蓝方"画预览箭头（敌人查看模式不预览）
	if (viewMode === 'enemy') {
		clearOrderPreview();
		return;
	}

	renderOrderPreview(e);
});

boardContainer.addEventListener('mouseup', function (e) {
	if (!dragBoxState) return;

	const st = dragBoxState;
	dragBoxState = null;

	clearOrderPreview();   // 一旦点击/松手，预览箭头消失

	if (st.moved) {
		// 画框多选：指挥模式=存活蓝方；查看敌人模式=存活红方
		hideBox();

		const left = Math.min(st.x0, e.clientX), right = Math.max(st.x0, e.clientX);
		const top = Math.min(st.y0, e.clientY), bottom = Math.max(st.y0, e.clientY);

		const inBox = armys.filter(p => {
			if (viewMode === 'enemy' ? !isAliveRed(p) : !isAliveBlue(p)) return false;

			const el = document.getElementById(p.id);
			if (!el) return false;

			const r = el.getBoundingClientRect();
			const cx = r.left + r.width / 2, cy = r.top + r.height / 2;

			return cx >= left && cx <= right && cy >= top && cy <= bottom;
		});

		if (viewMode === 'enemy') {
			selectEnemyMany(inBox);
		} else {
			selectMany(inBox);
		}

		return;
	}

	// 单击语义
	if (st.pieceEl) {

		const pieceData =
			armys.find(p => p.id === st.pieceEl.id);

		if (viewMode === 'enemy') {

			// 查看敌人模式：单击/加减选红方；点蓝方或空地 = 清空敌方选中
			if (isAliveRed(pieceData)) {

				if (e.ctrlKey || e.shiftKey) {
					toggleEnemy(pieceData);
				}
				else {
					selectEnemyOnly(pieceData);
				}

			} else {

				clearEnemies();
			}

			return;
		}

		if (isAliveBlue(pieceData)) {

			if (e.ctrlKey || e.shiftKey) {

				toggleSelect(pieceData);          // Ctrl/Shift + 单击：加减选中
				return;

			}

			if (selectedPieces.length === 0) {

				selectOnly(pieceData);            // 没有任何选中时，单击=选中它
				return;

			}

			if (selectedPieces.length === 1) {

				// 已有单个选中：点自己=原地待命；点其它单位=让它移动到该单位的位置（原逻辑）
				issueMoveTo(pieceData.posx, pieceData.posy);
				return;

			}

			selectOnly(pieceData);                // 多选状态下点某蓝兵：切换为只选它
			return;
		}

		// 点到红方/死亡单位：指挥模式下当作在该格下令
	}

	// 点空白处：给当前所有选中军队下令移动（仅指挥模式）
	if (viewMode === 'enemy' || selectedPieces.length === 0) return;

	const rect = boardContentRect();

	const targetX =
		Math.max(
			0,
			Math.min(
				e.clientX - rect.left,
				boardContainer.clientWidth
			)
		);

	const targetY =
		Math.max(
			0,
			Math.min(
				e.clientY - rect.top,
				boardContainer.clientHeight
			)
		);

	issueMoveTo(
		getPosByCell(targetX),
		getPosByCell(targetY)
	);
});

boardContainer.addEventListener('mouseleave', function () {
	if (dragBoxState) {
		dragBoxState = null;
		hideBox();
	}

	if (isArrowVisible) hideArrow();

	clearOrderPreview();
});

document.getElementById('button-replay').addEventListener('click', () => {
	/* 重玩是“立即重开战斗”，不再重复剧情、简报和第一关教程图。
	 * replay 参数只使用一次；新页面消费后会立刻从地址栏清掉。 */
	const replayUrl = new URL(window.location.href);
	replayUrl.searchParams.delete('resume');
	replayUrl.searchParams.set('replay', '1');
	window.location.href = replayUrl.toString();
})

/* to-do #13/#14：失败后跳转对应结局页（game7 失败 -> destiny-fail.html，其余 -> fail.html） */
const _failGo = document.getElementById('button-fail');

if (_failGo) {
	_failGo.addEventListener('click', function () {
		window.location.href =
			_failGo.dataset.target || 'fail.html';
	});
}

/* to-do #3：关卡内 Save/Load（目标可选 a.save 或 存档1/2/3）+ 返回主界面 */
function selectedTarget() {
	const sel = document.getElementById('slot-select');
	if (sel && isFileId(sel.value)) return String(sel.value);
	return AUTO_ID;
}

document.getElementById('button-save').addEventListener('click', function () {
	const user = currentUserSafe();
	if (!user) {
		if (typeof toast === 'function') toast('未登录：请先回主界面登录，再来保存');
		return;
	}
	if (typeof CURRENT_LEVEL_ID === 'undefined') return;
	const id = selectedTarget();
	const snap = captureSnapshot();
	if (!snap) return;
	const cur = (id === AUTO_ID) ? getAuto(user) : getManual(user, id);

	function doSave() {
		const ok = (id === AUTO_ID) ? saveSnapshotToAuto(user, snap) : saveToManual(user, id, snap);
		if (ok) {
			if (typeof toast === 'function') toast('已保存到 ' + fileName(id));
			refreshSlotSelect();
		}
	}

	if (cur && cur.snapshot) {
		const ask = '覆盖 ' + fileName(id) + ' 里的中途存档（第 ' + cur.snapshot.level + ' 关）？';
		if (typeof modalConfirm === 'function') { modalConfirm(ask, doSave); return; }
		if (!confirm(ask)) return;
	}
	doSave();
});

document.getElementById('button-load').addEventListener('click', function () {
	const user = currentUserSafe();
	if (!user) {
		if (typeof toast === 'function') toast('未登录');
		return;
	}
	const id = selectedTarget();
	let snap;

	if (id === AUTO_ID) {
		snap = autoSnapshot(user);
		if (!snap) {
			if (typeof toast === 'function') toast(fileName(id) + ' 里没有中途存档');
			return;
		}
	} else {
		const f = getManual(user, id);
		if (!f || !f.snapshot) {
			if (typeof toast === 'function') toast(fileName(id) + ' 里没有中途存档');
			return;
		}
		snap = f.snapshot;
	}

	if (Number(snap.level) !== CURRENT_LEVEL_ID) {
		const msg = '该存档属于第 ' + snap.level + ' 关，当前在第 ' + CURRENT_LEVEL_ID + ' 关，不能在这里读取（请回主界面“载入”后，再进入对应关继续）';
		if (typeof modalNotice === 'function') modalNotice(msg); else alert(msg);
		return;
	}

	if (id !== AUTO_ID) { loadManualToAuto(user, id); }

	const ask = '读取 ' + fileName(id) + '（第 ' + snap.level + ' 关，剩 ' + snap.remain_turns + ' 回合）会覆盖当前未保存进度，继续？';
	function doLoad() { loadSnapshot(snap); }
	if (typeof modalConfirm === 'function') { modalConfirm(ask, doLoad); return; }
	if (!confirm(ask)) return;
	doLoad();
});

document.getElementById('button-exit').addEventListener('click', function () {
	window.location.href = 'menu.html';
});

/* 结算页的 Next 跳转
 *   · 目标在进入结算页时由 checkWinState() 算好并写在 #button-next-game 的 data-target 上：
 *       第 7 关通关 → hidden-end.html；下一关是结局页（第 6 关 → end-game.html）→ 直接进结局；
 *       下一关是关卡（第 1~5 关）→ menu.html?unlock=<刚通关的关号>，主界面地图会播"路线解锁"动画，
 *       再由玩家点地图上的下一个标记进入（不再直接跳进下一关）。
 *   · "下一关是不是结局"仍以 levels.js 的 nextLevelFile() 为准，不在这里写死。 */
document.getElementById('button-next-game').addEventListener('click', function () {
	window.location.href = this.dataset.target || 'menu.html';
});

async function showRedEffect(){

	armys.forEach(element => {

		if(element.color == 'red') {

			document.getElementById(element.id)
				.classList.add('highlighted');
		}
	});

	setTimeout(() => {

		armys.forEach(element => {

			if(element.color == 'red') {

				document.getElementById(element.id)
					.classList.remove('highlighted');
			}
		});

		setTimeout(() => {

			armys.forEach(element => {

				if(element.color == 'red') {

					document.getElementById(element.id)
						.classList.add('highlighted');
				}
			});

			setTimeout(() => {

				armys.forEach(element => {

					if(element.color == 'red') {

						document.getElementById(element.id)
							.classList.remove('highlighted');
					}
				});

			}, 1000);

		}, 1000);

	}, 1000);
}

window.addEventListener('load', showRedEffect);

/* ========== to-do #5：左侧显示条 ========== */

const UNIT_NAME_MAP = {
	'步': '步兵',
	'炮': '炮兵',
	'骑': '骑兵',
	'散': '散兵',
	'掷': '掷弹兵'
};
const UNIT_NAME_KEYS = {
	'步': 'unit.infantry', '炮': 'unit.artillery', '骑': 'unit.cavalry',
	'散': 'unit.skirmisher', '掷': 'unit.grenadier'
};

function unitDisplayName(p) {
	const fallback = UNIT_NAME_MAP[p.cls] || p.cls || p.img || '?';
	const key = UNIT_NAME_KEYS[p.cls];
	return key ? gameText(key, null, fallback) : gameContent(fallback);
}

function lpRatioOf(p) {

	const max = p.lpMax || p.lp || 1;

	return Math.max(
		0,
		Math.min(
			1,
			(p.lp || 0) / max
		)
	);
}

// 渲染左侧显示条：当前选中的（存活）蓝方军队及其属性 + LP 进度条
function renderInfoPanel() {

	const bar = document.getElementById('info-bar');

	if (!bar) return;

	const list =
		selectedPieces.filter(isAliveBlue);

	bar.innerHTML = '';

	if (list.length === 0) {
		bar.style.display = 'none';
		return;
	}

	bar.style.display = 'block';

	const head = document.createElement('div');
	head.className = 'info-head';
	head.textContent = gameText('game.selected', { count: list.length }, '选中部队（' + list.length + '）');

	bar.appendChild(head);

	list.forEach(p => {

		const row = document.createElement('div');
		row.className = 'info-row';

		const name = unitDisplayName(p);

		const ratio = lpRatioOf(p);

		const color =
			ratio > 0.5
				? '#4a7c34'
				: ratio > 0.25
					? '#c99b2e'
					: '#c0392b';

		const titleLine =
			document.createElement('div');

		titleLine.className =
			'info-titleline';

		const nameSpan =
			document.createElement('span');

		nameSpan.className =
			'info-title';

		nameSpan.textContent =
			name;

		const rm =
			document.createElement('button');

		rm.className =
			'info-remove';

		rm.textContent = '✕';

		rm.title = gameText('game.removeAlly', null, '取消选中（移出显示条）');

		rm.addEventListener(
			'click',
			function () {
				removeFromSelection(p);
			}
		);

		row.dataset.pieceId = p.id;

		titleLine.appendChild(nameSpan);
		titleLine.appendChild(rm);
		row.appendChild(titleLine);

		const stats =
			document.createElement('div');

		stats.className =
			'info-stats';

		stats.textContent = gameText('game.stats', { range: p.atkrange, attack: p.atk, speed: p.speed }, '射程 ' + p.atkrange + ' · 攻击 ' + p.atk + ' · 速度 ' + p.speed);

		row.appendChild(stats);

		const lpbar =
			document.createElement('div');

		lpbar.className =
			'info-lpbar';

		const fill =
			document.createElement('div');

		fill.className =
			'info-lpfill';

		fill.style.width =
			(ratio * 100).toFixed(1) +
			'%';

		fill.style.background =
			color;

		lpbar.appendChild(fill);
		row.appendChild(lpbar);

		const lptext =
			document.createElement('div');

		lptext.className =
			'info-lptext';

		lptext.textContent =
			'LP ' +
			Math.max(0, Math.round(p.lp)) +
			' / ' +
			(p.lpMax || p.lp);

		row.appendChild(lptext);

		bar.appendChild(row);
	});
}

addSelectionListener(renderInfoPanel);
renderInfoPanel();

/* ========== 查看敌人模式（to-do #4/#5 扩展） ========== */

let viewMode = 'ally';
let selectedEnemies = new Array();
const enemySelectionListeners = new Array();

function isAliveRed(p) {
	return !!p &&
		p.color === 'red' &&
		!p.disabled;
}

function getEnemySelection() {
	return selectedEnemies;
}

function addEnemySelectionListener(fn) {
	enemySelectionListeners.push(fn);
}

function fireEnemySelectionChanged() {

	enemySelectionListeners.forEach(fn => {

		try {
			fn();
		} catch (e) {
			/* 忽略单个监听器的错误 */
		}

	});
}

function refreshEnemySelectionUI() {

	clearHoverMatches();

	document
		.querySelectorAll('.chess.sel-enemy')
		.forEach(el =>
			el.classList.remove('sel-enemy')
		);

	selectedEnemies.forEach(p => {

		const el =
			document.getElementById(p.id);

		if (el) {
			el.classList.add('sel-enemy');
		}
	});

	fireEnemySelectionChanged();
}

function clearEnemies() {
	selectedEnemies = [];
	refreshEnemySelectionUI();
}

function selectEnemyOnly(p) {
	selectedEnemies = [p];
	refreshEnemySelectionUI();
}

function toggleEnemy(p) {

	const i =
		selectedEnemies.indexOf(p);

	if (i >= 0) {
		selectedEnemies.splice(i, 1);
	} else {
		selectedEnemies.push(p);
	}

	refreshEnemySelectionUI();
}

function selectEnemyMany(list) {
	selectedEnemies = list.slice();
	refreshEnemySelectionUI();
}

function removeFromEnemies(pieceData) {

	const i =
		selectedEnemies.indexOf(pieceData);

	if (i >= 0) {
		selectedEnemies.splice(i, 1);
		refreshEnemySelectionUI();
	}
}

// 右侧面板：被选中红方单位的剩余血量（LP 进度条）
function renderEnemyPanel() {

	const bar =
		document.getElementById('enemy-info');

	if (!bar) return;

	const list =
		selectedEnemies.filter(isAliveRed);

	bar.innerHTML = '';

	if (list.length === 0) {
		bar.style.display = 'none';
		return;
	}

	bar.style.display = 'block';

	const head =
		document.createElement('div');

	head.className =
		'info-head';

	head.textContent = gameText('game.enemies', { count: list.length }, '敌方部队（' + list.length + '）');

	bar.appendChild(head);

	list.forEach(p => {

		const row =
			document.createElement('div');

		row.className =
			'info-row';

		const name = unitDisplayName(p);

		const ratio =
			lpRatioOf(p);

		const color =
			ratio > 0.5
				? '#4a7c34'
				: ratio > 0.25
					? '#c99b2e'
					: '#c0392b';

		const titleLine =
			document.createElement('div');

		titleLine.className =
			'info-titleline';

		const nameSpan =
			document.createElement('span');

		nameSpan.className =
			'info-title';

		nameSpan.textContent =
			name;

		const rm =
			document.createElement('button');

		rm.className =
			'info-remove';

		rm.textContent = '✕';

		rm.title = gameText('game.removeEnemy', null, '移出敌方查看');

		rm.addEventListener(
			'click',
			function () {
				removeFromEnemies(p);
			}
		);

		row.dataset.pieceId =
			p.id;

		titleLine.appendChild(nameSpan);
		titleLine.appendChild(rm);
		row.appendChild(titleLine);

		const lpbar =
			document.createElement('div');

		lpbar.className =
			'info-lpbar';

		const fill =
			document.createElement('div');

		fill.className =
			'info-lpfill';

		fill.style.width =
			(ratio * 100).toFixed(1) +
			'%';

		fill.style.background =
			color;

		lpbar.appendChild(fill);
		row.appendChild(lpbar);

		const lptext =
			document.createElement('div');

		lptext.className =
			'info-lptext';

		lptext.textContent =
			'LP ' +
			Math.max(0, Math.round(p.lp)) +
			' / ' +
			(p.lpMax || p.lp);

		row.appendChild(lptext);

		bar.appendChild(row);
	});
}

addEnemySelectionListener(renderEnemyPanel);

// 切换"指挥 / 查看敌人"模式
function setViewMode(m) {

	viewMode =
		(m === 'enemy')
			? 'enemy'
			: 'ally';

	const btn =
		document.getElementById('button-mode');

	if (btn) {
		btn.textContent = (viewMode === 'enemy')
			? gameText('game.backCommand', null, '返回指挥')
			: gameText('game.viewEnemy', null, '查看敌人');
	}

	if (viewMode === 'enemy') {
		clearSelection();
	} else {
		clearEnemies();
	}

	hideArrow();
}

document
	.getElementById('button-mode')
	.addEventListener('click', function () {
		setViewMode(
			viewMode === 'enemy'
				? 'ally'
				: 'enemy'
		);
	});

renderEnemyPanel();

/* Esc 是战场级“取消当前操作”：蓝方选中、敌方查看选中、框选和临时箭头
 * 必须一起清理。弹窗/剧情打开时让它们自己的 Esc 逻辑优先处理。 */
document.addEventListener('keydown', function (e) {
	if (e.key !== 'Escape' || e.defaultPrevented) return;
	if (document.querySelector('.ui-modal-mask, .dialog-overlay, .level-intro-image-overlay')) return;

	const hadSelection = selectedPieces.length > 0 || selectedEnemies.length > 0;
	if (!hadSelection && !dragBoxState) return;

	e.preventDefault();
	dragBoxState = null;
	hideBox();
	clearOrderPreview();
	if (isArrowVisible) hideArrow();
	clearSelection();
	clearEnemies();
	clearHoverMatches();
});

/* ---------- 显示条悬停联动 ---------- */

function clearHoverMatches() {
	document
		.querySelectorAll('.chess.hover-match')
		.forEach(el =>
			el.classList.remove(
				'hover-match',
				'hover-blue',
				'hover-red'
			)
		);
}

function rowPiece(row) {

	if (
		!row ||
		!row.dataset ||
		!row.dataset.pieceId
	) {
		return null;
	}

	return armys.find(
		x => x.id === row.dataset.pieceId
	) || null;
}

function syncRowHover(barEl) {

	if (!barEl) return;

	function markHover(piece) {

		const el =
			piece
				? document.getElementById(piece.id)
				: null;

		if (el) {

			el.classList.add(
				'hover-match'
			);

			el.classList.add(
				piece.color === 'red'
					? 'hover-red'
					: 'hover-blue'
			);

		}
	}

	function unmarkHover(piece) {

		const el =
			piece
				? document.getElementById(piece.id)
				: null;

		if (el) {
			el.classList.remove(
				'hover-match',
				'hover-blue',
				'hover-red'
			);
		}
	}

	barEl.addEventListener('mouseover', function (e) {

		const row =
			e.target.closest('.info-row');

		if (!row) return;

		markHover(
			rowPiece(row)
		);
	});

	barEl.addEventListener('mouseout', function (e) {

		const row =
			e.target.closest('.info-row');

		if (!row) return;

		if (row.contains(e.relatedTarget)) {
			return;
		}

		unmarkHover(
			rowPiece(row)
		);
	});
}

syncRowHover(
	document.getElementById('info-bar')
);

syncRowHover(
	document.getElementById('enemy-info')
);

/* ========== to-do #7：攻击范围显示 ========== */

let rangeCircles = [];

function renderRangeOverlays() {

	const old =
		document.getElementById('range-layer');

	if (old) old.remove();

	rangeCircles = [];

	const list =
		(viewMode === 'enemy')
			? selectedEnemies.filter(isAliveRed)
			: selectedPieces.filter(isAliveBlue);

	if (
		list.length === 0 ||
		!boardContainer
	) {
		return;
	}

	const layer =
		document.createElement('div');

	layer.id =
		'range-layer';

	layer.className =
		'range-layer';

	list.forEach(p => {

		const r =
			Number(p.atkrange) *
			distance;

		if (!r || r <= 0) return;

		const c =
			document.createElement('div');

		c.className =
			'range-circle ' +
			(
				p.color === 'red'
					? 'range-circle--enemy'
					: 'range-circle--ally'
			);

		const cx =
			offset +
			distance *
			p.posx;

		const cy =
			offset +
			distance *
			p.posy;

		c.style.left =
			(cx - r) + 'px';

		c.style.top =
			(cy - r) + 'px';

		c.style.width =
			(2 * r) + 'px';

		c.style.height =
			(2 * r) + 'px';

		layer.appendChild(c);

		rangeCircles.push({
			piece: p,
			el: c
		});
	});

	boardContainer.appendChild(layer);
}

function updateRangePositions() {

	const keep = [];

	rangeCircles.forEach(item => {

		const p = item.piece;
		const el = item.el;

		if (p.disabled) {

			el.remove();
			return;
		}

		const r =
			Number(p.atkrange) *
			distance;

		const cx =
			offset +
			distance *
			p.posx;

		const cy =
			offset +
			distance *
			p.posy;

		el.style.left =
			(cx - r) + 'px';

		el.style.top =
			(cy - r) + 'px';

		keep.push(item);
	});

	rangeCircles = keep;
}

addSelectionListener(
	renderRangeOverlays
);

addEnemySelectionListener(
	renderRangeOverlays
);

/* ========== to-do #8：新兵种试玩 ========== */

window.__spawnUnit =
	function (color, unitKey, posx, posy) {

		const defs = {
			'骑': UNIT_CAVALRY,
			'散': UNIT_SKIRMISHER,
			'掷': UNIT_GRENADIER
		};

		const def = defs[unitKey];

		if (!def) {
			console.log('[__spawnUnit] 未知兵种：骑 / 散 / 掷');
			return;
		}

		if (
			typeof boardContainer === 'undefined' ||
			!boardContainer ||
			!armys
		) {
			return;
		}

		const piece =
			document.createElement('div');

		piece.className =
			'chess chess--' +
			color;

		piece.id =
			'piece-' +
			piece_cnt;

		piece.innerHTML =
			'<p>' +
			def.cls +
			'</p>';

		boardContainer.appendChild(piece);

		armys.push({
			id: piece.id,
			color: color,
			posx: posx,
			posy: posy,
			speed: def.speed,
			targetx: posx,
			targety: posy,
			atkrange: def.atkrange,
			atk: def.atk,
			lp: def.lp,
			lpMax: def.lp,
			disabled: false,
			cls: def.cls,
			img: ''
		});

		movePieceTo(
			piece.id,
			posx,
			posy
		);

		piece_cnt ++;

		console.log('[__spawnUnit] 已生成 ' + (color === 'red' ? '敌方' : '我方') + def.cls + ' 于 (' + posx + ',' + posy + ')');
	};

/* ========== to-do #11：常驻行动指示箭头 ========== */

let orderLayer = null;
let orderEls = {};

function orderArrowMarkup() {
	return '<span class="oa-origin"></span>' +
		'<span class="oa-line"></span>' +
		'<span class="oa-head"></span>';
}

function positionOrderArrow(el, x1, y1, x2, y2) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist < 2) return false;

	const deg = Math.atan2(dy, dx) * 180 / Math.PI;
	el.style.left = x1 + 'px';
	el.style.top = (y1 - 9) + 'px';
	el.style.width = dist + 'px';
	el.style.transform = 'rotate(' + deg + 'deg)';
	return true;
}

function ensureOrderLayer() {

	if (
		orderLayer &&
		document.body.contains(orderLayer)
	) {
		return orderLayer;
	}

	orderLayer =
		document.createElement('div');

	orderLayer.id =
		'order-layer';

	orderLayer.className =
		'order-layer';

	boardContainer.appendChild(
		orderLayer
	);

	orderEls = {};

	return orderLayer;
}

function removeOrderArrow(id) {

	const item =
		orderEls[id];

	if (item) {

		if (item.el.parentNode) {
			item.el.parentNode.removeChild(
				item.el
			);
		}

		delete orderEls[id];
	}
}

function upsertOrderArrow(
	id,
	x1,
	y1,
	x2,
	y2,
	isRed,
	commandSignature
) {

	let item =
		orderEls[id];

	if (!item) {

		const el =
			document.createElement('div');

		el.className =
			'order-arrow' +
			(
				isRed
					? ' order-arrow--red'
					: ''
			);

		el.innerHTML = orderArrowMarkup();

		orderLayer.appendChild(el);

		item = { el: el };

		orderEls[id] =
			item;
	}

	/* 只有“新下达/改换目标”的军令才重新播放铺展动画。
	 * 棋子在后续回合向目标移动时，箭头会随当前位置缩短，但不能每步都闪回重播。 */
	if (item.commandSignature !== commandSignature) {
		item.commandSignature = commandSignature;
		item.el.classList.remove('order-arrow--deploying');
		/* 强制提交一次无动画状态，随后重新加类，确保同一棋子改令时也从起点画到终点。 */
		void item.el.offsetWidth;
		item.el.classList.add('order-arrow--deploying');
	}

	if (!positionOrderArrow(item.el, x1, y1, x2, y2)) {

		removeOrderArrow(id);

		return;
	}
}

/* 每回合/每次下令后刷新 */

function renderOrderArrows() {

	if (
		typeof boardContainer === 'undefined' ||
		!boardContainer
	) {
		return;
	}

	const layer =
		ensureOrderLayer();

	const w =
		boardContainer.clientWidth;

	const h =
		boardContainer.clientHeight;

	const seen = {};

	armys.forEach(u => {

		if (u.disabled) return;

		const dx =
			u.targetx -
			u.posx;

		const dy =
			u.targety -
			u.posy;

		if (
			dx * dx +
			dy * dy <
			1e-4
		) {
			return;
		}

		const x1 =
			offset +
			distance *
			u.posx;

		const y1 =
			offset +
			distance *
			u.posy;

		const x2 =
			Math.max(
				0,
				Math.min(
					offset +
					distance *
					u.targetx,
					w
				)
			);

		const y2 =
			Math.max(
				0,
				Math.min(
					offset +
					distance *
					u.targety,
					h
				)
			);

		upsertOrderArrow(
			u.id,
			x1,
			y1,
			x2,
			y2,
			u.color === 'red',
			String(u.targetx) + ':' + String(u.targety)
		);

		seen[u.id] =
			true;
	});

	Object.keys(orderEls).forEach(
		id => {
			if (!seen[id]) {
				removeOrderArrow(id);
			}
		}
	);
}

/* ---- 预览箭头 ---- */

let previewLayer = null;
let previewEls = {};

function ensurePreviewLayer() {

	if (
		previewLayer &&
		document.body.contains(previewLayer)
	) {
		return previewLayer;
	}

	previewLayer =
		document.createElement('div');

	previewLayer.id =
		'preview-layer';

	previewLayer.className =
		'order-layer';

	previewLayer.style.zIndex =
		'5';

	boardContainer.appendChild(
		previewLayer
	);
	previewEls = {};

	return previewLayer;
}

function clearOrderPreview() {

	if (
		previewLayer &&
		previewLayer.parentNode
	) {
		previewLayer.innerHTML = '';
	}
	previewEls = {};
}

function previewArrow(
	id,
	x1,
	y1,
	x2,
	y2
) {
	let el = previewEls[id];
	if (!el) {
		el = document.createElement('div');
		el.className = 'order-arrow order-arrow--preview';
		el.innerHTML = orderArrowMarkup();
		ensurePreviewLayer().appendChild(el);
		previewEls[id] = el;
	}

	if (!positionOrderArrow(el, x1, y1, x2, y2)) {
		el.remove();
		delete previewEls[id];
	}
}

function renderOrderPreview(e) {

	if (viewMode === 'enemy') {
		clearOrderPreview();
		return;
	}

	const list =
		selectedPieces.filter(
			isAliveBlue
		);

	if (!list.length) {
		clearOrderPreview();
		return;
	}

	const rect = boardContentRect();

	const tx =
		Math.max(
			0,
			Math.min(
				e.clientX -
				rect.left,
				boardContainer.clientWidth
			)
		);

	const ty =
		Math.max(
			0,
			Math.min(
				e.clientY -
				rect.top,
				boardContainer.clientHeight
			)
		);

	const seen = {};
	list.forEach(p => {

		previewArrow(
			p.id,
			offset +
			distance *
			p.posx,

			offset +
			distance *
			p.posy,

			tx,
			ty
		);
		seen[p.id] = true;
	});

	Object.keys(previewEls).forEach(function (id) {
		if (!seen[id]) {
			previewEls[id].remove();
			delete previewEls[id];
		}
	});
}

/* ========== to-do #12/#13：战前情报 + 剧情对话 ========== */

/* ========== 从 demo-美化好 移植：棋盘揭示动画 ==========
 * 开场时 <body> 带 .level-opening（见各 gameN.html），CSS 借此隐藏战场；
 * 剧情/简报播完后由本函数摘掉该类并加 .level-revealing，战场淡入。
 * ====================================================== */
function revealBattlefield() {
	const page = document.body;
	page.classList.add('level-revealing');
	page.classList.remove('level-opening');
	window.setTimeout(function () { page.classList.remove('level-revealing'); }, 1000);
	window.dispatchEvent(new CustomEvent('battlefield:revealed'));
}

/* 剧情开始时就在后台请求并解码立绘、教程图，让后续翻页不再临时等待。 */
const introAssetWarmers = [];
function warmIntroImage(src) {
	if (!src || introAssetWarmers.some(function (image) { return image.src.indexOf(src.replace(/^\.\//, '')) !== -1; })) return;
	const image = new Image();
	image.decoding = 'async';
	image.src = src;
	introAssetWarmers.push(image);
	if (typeof image.decode === 'function') image.decode().catch(function () { /* load 事件仍可继续 */ });
}

function warmLevelIntroAssets(meta) {
	(meta.story || []).forEach(function (line) { if (line.portrait) warmIntroImage(line.portrait); });
	if (Number(CURRENT_LEVEL_ID) === 1) {
		warmIntroImage('./img/level1-intro-1.webp');
		warmIntroImage('./img/level1-intro-2.webp');
	}
}

/* ========== 进关流程（B 的立绘对话/简报页 → A 的第一关教程图） ==========
 * 第一关：立绘剧情 → 战前简报（开 战）→ 教程图1 → 教程图2 → 淡入战场
 * 其余关：立绘剧情 → 战前简报（开 战）→ 淡入战场
 *
 * 注：教程图刻意排在剧情与简报【之后】——先交代剧情、再给指令，
 *     最后用两张图把「选中/下令/攻击」和兵种定位讲清楚，然后进场。
 * ==================================================================== */
function showLevelIntro() {
	if (typeof CURRENT_LEVEL_ID === 'undefined' || typeof getLevelById !== 'function') { revealBattlefield(); return; }

	const meta = getLevelById(CURRENT_LEVEL_ID);
	if (!meta) { revealBattlefield(); return; }

	/* Replay 入口：跳过整套开场，恢复音乐并直接进棋盘。
	 * 用 replaceState 清掉一次性参数，玩家随后普通刷新时仍会看到正常剧情。 */
	const entryUrl = new URL(window.location.href);
	if (entryUrl.searchParams.get('replay') === '1') {
		entryUrl.searchParams.delete('replay');
		window.history.replaceState(null, '', entryUrl.pathname + entryUrl.search + entryUrl.hash);
		if (typeof initBgm === 'function') initBgm('game-music');
		revealBattlefield();
		return;
	}
	warmLevelIntroAssets(meta);

	/* 兜底包装：任何一步抛异常都必须 revealBattlefield()，
	 * 否则页面会永久停在 .level-opening（战场全黑、按钮全部不可点）。 */
	const safe = function (fn) {
		return function () {
			try {
				fn();
			} catch (err) {
				console.error('showLevelIntro step failed, revealing battlefield:', err);
				revealBattlefield();
			}
		};
	};

	/* ---- B 移植：把章节资料补到每句对白上，关卡作者只需维护 levels.js ---- */
	const story = (meta.story || []).map(function (line) {
		return Object.assign({
			chapter: meta.chapter || meta.name,
			location: meta.location || '',
			scene: meta.scene || 'campaign'
		}, line);
	});

	/* ---- B 移植：把 A 原来的 hint 弹窗升级成一段"战役简报"页 ---- */
	story.push({
		who: function () { return gameText('dialogue.briefing', null, '战役简报'); },
		role: meta.name,
		text: function () {
			const hint = meta.hint ? gameContent(meta.hint) : gameText('dialogue.defeatAll', null, '击败所有红方单位即可获胜。');
			return gameText('game.briefingDifficulty', {
				level: Math.max(1, Math.min(7, Number(meta.difficulty) || 1)),
				mechanic: gameContent(meta.mechanic || ''),
				hint: hint
			}, hint);
		},
		kind: 'briefing',
		chapter: meta.chapter || meta.name,
		location: meta.location || '',
		scene: meta.scene || 'campaign',
		actionLabel: function () { return gameText('dialogue.startBattle', null, '开 战'); }
	});

	/* ---- A 保留：第一关的两张教程图（① 操作四步教学 ② 步兵兵种介绍） ----
	 * 位置：剧情对话与战前简报之后、淡入战场之前（见文件末尾的总流程）。 */
	const showIntroImages = function (next) {
		if (CURRENT_LEVEL_ID !== 1) {
			next();
			return;
		}

		const images = [
			'./img/level1-intro-1.webp',
			'./img/level1-intro-2.webp'
		];

		let index = 0;

		const showNextImage = function () {
			/* 两张图都看完了 */
			if (index >= images.length) {
				next();
				return;
			}

			const overlay = document.createElement('div');
			overlay.className = 'level-intro-image-overlay';

			/* 图片容器 */
			const imageBox = document.createElement('div');
			imageBox.className = 'level-intro-image-box';

			const image = document.createElement('img');
			image.className = 'level-intro-image';
			image.decoding = 'async';
			image.fetchPriority = 'high';
			image.src = images[index];
			image.alt = '第一关教程图 ' + (index + 1);
			image.draggable = false;
			imageBox.classList.add('is-loading');
			image.addEventListener('load', function () { imageBox.classList.remove('is-loading'); }, { once: true });
			image.addEventListener('error', function () { imageBox.classList.remove('is-loading'); }, { once: true });

			/* 图片右上角关闭按钮 */
			const closeBtn = document.createElement('button');
			closeBtn.className = 'level-intro-close';
			closeBtn.innerHTML = '&times;';
			closeBtn.setAttribute('aria-label', '关闭教程图');

			closeBtn.addEventListener('click', function () {
				overlay.remove();
				index++;
				showNextImage();
			});

			imageBox.appendChild(image);
			imageBox.appendChild(closeBtn);
			if (image.complete) imageBox.classList.remove('is-loading');

			overlay.appendChild(imageBox);
			document.body.appendChild(overlay);
		};

		showNextImage();
	};

	/* ---- 开战：第一关先过两张教程图，其余关卡直接淡入战场 ---- */
	const startBattle = safe(function () {
		showIntroImages(revealBattlefield);
	});

	/* ---- A 保留：dialog.js 不可用时的兜底简报 ---- */
	const runHint = function () {
		const overlay = document.createElement('div');
		overlay.className = 'intro-overlay';

		const box = document.createElement('div');
		box.className = 'intro-box';

		const title = document.createElement('h2');
			title.textContent = gameContent(meta.name);

		const body = document.createElement('p');
		body.className = 'intro-text';
			body.textContent = meta.hint ? gameContent(meta.hint) : gameText('dialogue.defeatAll', null, '击败所有红方单位即可获胜。');

		const act = document.createElement('div');
		act.className = 'intro-actions';

		const go = document.createElement('button');
		go.className = 'game-btn intro-go';
			go.textContent = gameText('dialogue.startBattle', null, '开 战');

		go.addEventListener('click', function () {
			overlay.remove();
			startBattle();
		});

		act.appendChild(go);
		box.appendChild(title);
		box.appendChild(body);
		box.appendChild(act);
		overlay.appendChild(box);
		document.body.appendChild(overlay);
	};

	/* ---- 总流程 ----
	 * 第一关：立绘剧情 → 战前简报（开 战）→ 教程图1 → 教程图2 → 淡入战场
	 * 其余关：立绘剧情 → 战前简报（开 战）→ 淡入战场
	 */
	if (typeof playDialogue === 'function') {
		playDialogue(story, startBattle);
		return;
	}
	runHint();
}

/* 只更新文字，不重载页面，也不改动回合、选中或存档状态。 */
window.addEventListener('ui:languagechange', function () {
	renderFooterStatus();
	refreshSlotSelect();
	renderUndoButton();
	renderInfoPanel();
	renderEnemyPanel();
	renderBattleStatus();
	const modeButton = document.getElementById('button-mode');
	if (modeButton) {
		modeButton.textContent = viewMode === 'enemy'
			? gameText('game.backCommand', null, '返回指挥')
			: gameText('game.viewEnemy', null, '查看敌人');
	}
	const tip = document.getElementById('loseTips');
	if (tip && tip.dataset.sourceText) tip.textContent = gameContent(tip.dataset.sourceText);
});

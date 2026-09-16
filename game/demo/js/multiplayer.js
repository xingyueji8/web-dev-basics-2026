/* 红蓝联机会战：PeerJS 只负责 WebRTC 信令，战局数据经浏览器 DataChannel 点对点传输。
 * 房主（蓝方）是权威端：红方只发送本轮军令，房主执行同一套 24 帧结算后广播战局，
 * 避免双方浮点误差或同时操作导致状态分叉。房间不会写入战役存档。 */
(function () {
	'use strict';

	if (typeof currentUser !== 'function' || !currentUser()) {
		window.location.replace('index.html');
		return;
	}

	var playerName = currentUser();
	var TEXT = {
		kicker: { 'zh-CN': 'P2P FIELD COMMAND · 联机军帐', en: 'P2P FIELD COMMAND' },
		title: { 'zh-CN': '红蓝会战', en: 'Red–Blue Engagement' },
		back: { 'zh-CN': '返回模式选择', en: 'Back to Mode Select' },
		rulesKicker: { 'zh-CN': 'RULES OF ENGAGEMENT · 交战条例', en: 'RULES OF ENGAGEMENT' },
		rulesTitle: { 'zh-CN': '交战规则', en: 'Rules of Engagement' },
		rule1: { 'zh-CN': '蓝方为房主、红方为加入者；开局掷骰，点数高者先行动。', en: 'The host commands Blue and the joining player commands Red; the higher opening die acts first.' },
		rule2: { 'zh-CN': '双方轮流行动；一轮内可给任意数量己方棋子下令，再统一结束行动。', en: 'Players alternate. During your turn, issue orders to any number of your units, then end the action.' },
		rule3: { 'zh-CN': '不限制回合。先歼灭对方全军者获胜；计时结束时存活棋子更多者获胜。', en: 'There is no turn limit. Eliminate the enemy first, or have more surviving units when time expires.' },
		rule4: { 'zh-CN': '双方使用同一份公平编制；同数存活时，以剩余生命比例裁决，再相同则平局。', en: 'Both sides use one fair force template. Equal survivors are settled by remaining health ratio, then a draw.' },
		networkNote: { 'zh-CN': '连接使用浏览器 WebRTC 点对点数据通道；房间仅在双方页面保持打开时存在。', en: 'The match uses a browser WebRTC peer-to-peer data channel. The room exists only while both pages stay open.' },
		hostTitle: { 'zh-CN': '创建房间 · 蓝方', en: 'Create Room · Blue' },
		hostCopy: { 'zh-CN': '由你设置双方编制与对局时间，然后把六位房间码发给对手。', en: 'Set the shared force and match time, then send the six-character room code to your opponent.' },
		create: { 'zh-CN': '创建房间', en: 'Create Room' },
		joinTitle: { 'zh-CN': '加入房间 · 红方', en: 'Join Room · Red' },
		joinCopy: { 'zh-CN': '输入房主发来的六位房间码，连接后确认同一份编制。', en: 'Enter the host\'s six-character code, then confirm the shared force.' },
		join: { 'zh-CN': '加入房间', en: 'Join Room' },
		roomCode: { 'zh-CN': '房间码', en: 'Room Code' },
		copy: { 'zh-CN': '复制邀请', en: 'Copy Invite' },
		armyKicker: { 'zh-CN': 'FAIR FORCE TEMPLATE · 公平编制', en: 'FAIR FORCE TEMPLATE' },
		armyTitle: { 'zh-CN': '双方共同编制', en: 'Shared Force' },
		strength: { 'zh-CN': '军力', en: 'Power' },
		units: { 'zh-CN': '棋子', en: 'Units' },
		infantry: { 'zh-CN': '步兵', en: 'Infantry' },
		cavalry: { 'zh-CN': '骑兵', en: 'Cavalry' },
		skirmisher: { 'zh-CN': '散兵', en: 'Skirmisher' },
		artillery: { 'zh-CN': '炮兵', en: 'Artillery' },
		grenadier: { 'zh-CN': '掷弹兵', en: 'Grenadier' },
		duration: { 'zh-CN': '对局时间', en: 'Match Time' },
		ready: { 'zh-CN': '确认编制并就绪', en: 'Confirm and Ready' },
		cancelReady: { 'zh-CN': '取消就绪', en: 'Cancel Ready' },
		idle: { 'zh-CN': '请选择创建或加入房间。', en: 'Create or join a room.' },
		initiative: { 'zh-CN': 'INITIATIVE · 先攻判定', en: 'INITIATIVE' },
		diceTitle: { 'zh-CN': '命运正在掷骰', en: 'The Dice Decide' },
		blue: { 'zh-CN': '蓝方', en: 'Blue' },
		red: { 'zh-CN': '红方', en: 'Red' },
		timeRemain: { 'zh-CN': '剩余时间', en: 'Time Remaining' },
		commandHint: { 'zh-CN': '选择己方棋子，再点击空地或敌军下令；可反复选择不同部队。', en: 'Select your units, then click ground or an enemy to order them. Repeat for as many groups as needed.' },
		endTurn: { 'zh-CN': '结束本方行动', en: 'End Action' },
		battleReport: { 'zh-CN': 'BATTLE REPORT · 战果', en: 'BATTLE REPORT' },
		playAgain: { 'zh-CN': '再开一局', en: 'Play Again' },
		loadingService: { 'zh-CN': '正在联络 WebRTC 信令站……', en: 'Contacting the WebRTC signaling service…' },
		waitingOpponent: { 'zh-CN': '房间 {code} 已建立，等待红方加入。', en: 'Room {code} is open. Waiting for Red.' },
		joining: { 'zh-CN': '正在加入房间 {code}……', en: 'Joining room {code}…' },
		connected: { 'zh-CN': '连接成功：{blue}（蓝）对 {red}（红）。双方就绪后掷骰。', en: 'Connected: {blue} (Blue) vs {red} (Red). Ready both sides to roll.' },
		serviceFail: { 'zh-CN': '联机库加载失败。请检查网络后刷新页面；通关模式仍可离线游玩。', en: 'The online library failed to load. Check your network and refresh; Campaign remains available offline.' },
		invalidCode: { 'zh-CN': '请输入完整的六位房间码。', en: 'Enter a complete six-character room code.' },
		connectionFail: { 'zh-CN': '连接未建立：{reason}', en: 'Connection failed: {reason}' },
		disconnected: { 'zh-CN': '与对手的连接已断开，本局已暂停。可返回军帐重新建房。', en: 'The opponent disconnected and the match is paused. Return to the war room to create another room.' },
		validForce: { 'zh-CN': '编制有效：双方各 {units} 支，军力 {points}/35。', en: 'Valid force: {units} units per side, power {points}/35.' },
		invalidForce: { 'zh-CN': '双方需各带 4—18 支棋子，且军力不得超过 35。', en: 'Each side needs 4–18 units and no more than 35 power.' },
		hostControls: { 'zh-CN': '房主可调整；修改编制会取消双方就绪。', en: 'The host may edit this force; changes cancel both ready states.' },
		guestPreview: { 'zh-CN': '房主正在设置双方共同编制；你可查看并确认。', en: 'The host controls this shared force. Review it and confirm.' },
		readyState: { 'zh-CN': '蓝方 {blue} · 红方 {red}', en: 'Blue {blue} · Red {red}' },
		readyYes: { 'zh-CN': '已就绪', en: 'ready' },
		readyNo: { 'zh-CN': '未就绪', en: 'not ready' },
		copied: { 'zh-CN': '邀请链接已复制。', en: 'Invite link copied.' },
		copyFail: { 'zh-CN': '无法自动复制，请手动发送房间码 {code}。', en: 'Could not copy automatically. Send room code {code} manually.' },
		blueFirst: { 'zh-CN': '蓝方以 {blue}:{red} 取得先手。', en: 'Blue wins initiative {blue}:{red}.' },
		redFirst: { 'zh-CN': '红方以 {red}:{blue} 取得先手。', en: 'Red wins initiative {red}:{blue}.' },
		myTurn: { 'zh-CN': '第 {turn} 轮 · 轮到你（{side}）下令', en: 'Round {turn} · Your action ({side})' },
		theirTurn: { 'zh-CN': '第 {turn} 轮 · 等待对手（{side}）下令', en: 'Round {turn} · Waiting for {side}' },
		resolving: { 'zh-CN': '军令已送出，等待房主结算……', en: 'Orders sent. Waiting for the host to resolve them…' },
		orderGround: { 'zh-CN': '已向 {count} 支部队下达机动命令。', en: 'Movement ordered for {count} unit(s).' },
		orderFollow: { 'zh-CN': '已命令 {count} 支部队追踪 {target}；目标移动时箭头会随行。', en: '{count} unit(s) ordered to track {target}; arrows will follow a moving target.' },
		selectedDetail: { 'zh-CN': '{name} {index} · 生命 {hp}/{max} · 射程 {range} · 攻击 {atk} · 速度 {speed}', en: '{name} {index} · HP {hp}/{max} · Range {range} · Attack {atk} · Speed {speed}' },
		timeoutWait: { 'zh-CN': '时间已到，等待房主裁决战果……', en: 'Time is up. Waiting for the host\'s ruling…' },
		blueWin: { 'zh-CN': '蓝方胜利', en: 'Blue Victory' },
		redWin: { 'zh-CN': '红方胜利', en: 'Red Victory' },
		draw: { 'zh-CN': '双方战平', en: 'Draw' },
		resultElimination: { 'zh-CN': '{winner}先行歼灭了对方全部棋子。蓝方存活 {blue}，红方存活 {red}。', en: '{winner} eliminated the opposing force. Blue survivors: {blue}; Red survivors: {red}.' },
		resultTime: { 'zh-CN': '计时结束。蓝方存活 {blue}，红方存活 {red}；同数时按剩余生命比例裁决。', en: 'Time expired. Blue survivors: {blue}; Red survivors: {red}. Equal counts use remaining health ratio.' },
		resultDraw: { 'zh-CN': '计时结束，双方存活数与剩余生命比例完全相同。', en: 'Time expired with equal survivors and equal remaining health.' }
	};

	function text(key, vars) {
		var value = TEXT[key] || { 'zh-CN': key, en: key };
		var output = typeof uiLocalize === 'function' ? uiLocalize(value) : value['zh-CN'];
		return String(output).replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, name) {
			return vars && vars[name] !== undefined ? String(vars[name]) : '';
		});
	}

	function renderLanguage() {
		document.querySelectorAll('[data-mp-i18n]').forEach(function (node) {
			node.textContent = text(node.dataset.mpI18n);
		});
		document.title = text('title') + ' - ' + (typeof uiT === 'function' ? uiT('site.title') : '拿破仑战争');
		renderForceValidation();
		renderLobbyState();
		renderBattleHud();
		if (battleState) renderBattle();
	}

	var UNIT_DEFS = {
		infantry: { cls: '步', cost: 2, speed: 0.1, range: 0.5, atk: 0.5, lp: 60 },
		cavalry: { cls: '骑', cost: 3, speed: 0.2, range: 0.5, atk: 1.0, lp: 60 },
		skirmisher: { cls: '散', cost: 2, speed: 0.1, range: 1.0, atk: 0.7, lp: 42 },
		artillery: { cls: '炮', cost: 4, speed: 0.05, range: 4.0, atk: 0.7, lp: 60 },
		grenadier: { cls: '掷', cost: 4, speed: 0.05, range: 0.5, atk: 0.7, lp: 120 }
	};
	var UNIT_ORDER = ['infantry', 'cavalry', 'skirmisher', 'artillery', 'grenadier'];
	var DEFAULT_FORCE = { infantry: 6, cavalry: 3, skirmisher: 3, artillery: 2, grenadier: 0 };
	var config = Object.assign({}, DEFAULT_FORCE);
	var durationSeconds = 900;
	var role = '';
	var mySide = '';
	var roomCode = '';
	var peer = null;
	var connection = null;
	var connected = false;
	var ready = { blue: false, red: false };
	var players = { blue: playerName, red: '' };
	var phase = 'lobby';
	var battleState = null;
	var selectedIds = [];
	var matchEndAt = 0;
	var timerId = null;
	var waitingForHost = false;
	var finished = false;
	var peerLibraryPromise = null;

	var lobby = document.getElementById('mp-lobby');
	var diceStage = document.getElementById('mp-dice');
	var battle = document.getElementById('mp-battle');
	var board = document.getElementById('mp-board');
	var statusNode = document.getElementById('mp-status');
	var createButton = document.getElementById('mp-create');
	var joinButton = document.getElementById('mp-join');
	var joinInput = document.getElementById('mp-join-code');
	var roomShare = document.getElementById('mp-room-share');
	var roomCodeNode = document.getElementById('mp-room-code');
	var builder = document.getElementById('mp-army-builder');
	var readyButton = document.getElementById('mp-ready');
	var durationSelect = document.getElementById('mp-duration');
	var endTurnButton = document.getElementById('mp-end-turn');

	function setStatus(message, kind) {
		statusNode.textContent = message;
		statusNode.dataset.kind = kind || 'info';
	}

	function normalizeCode(value) {
		return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
	}

	function randomCode() {
		var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		var values = new Uint32Array(6);
		if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(values);
		else for (var i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 0xffffffff);
		return Array.from(values).map(function (value) { return alphabet[value % alphabet.length]; }).join('');
	}

	function loadPeerLibrary() {
		if (window.Peer) return Promise.resolve(window.Peer);
		if (peerLibraryPromise) return peerLibraryPromise;
		var sources = [
			'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js',
			'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js'
		];
		peerLibraryPromise = new Promise(function (resolve, reject) {
			function attempt(index) {
				if (index >= sources.length) { reject(new Error(text('serviceFail'))); return; }
				var script = document.createElement('script');
				script.src = sources[index];
				script.async = true;
				script.crossOrigin = 'anonymous';
				script.onload = function () { if (window.Peer) resolve(window.Peer); else attempt(index + 1); };
				script.onerror = function () { script.remove(); attempt(index + 1); };
				document.head.appendChild(script);
			}
			attempt(0);
		});
		return peerLibraryPromise;
	}

	function forceStats(value) {
		var units = 0;
		var points = 0;
		UNIT_ORDER.forEach(function (type) {
			var count = Math.max(0, Math.floor(Number(value[type]) || 0));
			units += count;
			points += count * UNIT_DEFS[type].cost;
		});
		return { units: units, points: points, valid: units >= 4 && units <= 18 && points <= 35 };
	}

	function readForceInputs() {
		var next = {};
		document.querySelectorAll('[data-unit]').forEach(function (input) {
			var max = Number(input.max) || 12;
			var value = Math.max(0, Math.min(max, Math.floor(Number(input.value) || 0)));
			input.value = String(value);
			next[input.dataset.unit] = value;
		});
		return next;
	}

	function writeForceInputs() {
		document.querySelectorAll('[data-unit]').forEach(function (input) {
			input.value = String(config[input.dataset.unit] || 0);
			input.disabled = role !== 'host';
		});
		durationSelect.value = String(durationSeconds);
		durationSelect.disabled = role !== 'host';
	}

	function renderForceValidation() {
		var stats = forceStats(config);
		document.getElementById('mp-points').textContent = String(stats.points);
		document.getElementById('mp-units').textContent = String(stats.units);
		var validation = document.getElementById('mp-validation');
		validation.textContent = stats.valid
			? text('validForce', stats) + ' ' + (role === 'guest' ? text('guestPreview') : text('hostControls'))
			: text('invalidForce');
		validation.dataset.valid = stats.valid ? 'true' : 'false';
		readyButton.disabled = !connected || !stats.valid;
		return stats.valid;
	}

	function send(payload) {
		if (!connection || !connection.open) return false;
		try { connection.send(payload); return true; }
		catch (error) { setStatus(text('connectionFail', { reason: error.message || String(error) }), 'error'); return false; }
	}

	function lobbyPayload() {
		return {
			type: 'lobby-state',
			config: Object.assign({}, config),
			duration: durationSeconds,
			ready: Object.assign({}, ready),
			players: Object.assign({}, players)
		};
	}

	function renderLobbyState() {
		if (phase !== 'lobby') return;
		writeForceInputs();
		renderForceValidation();
		readyButton.textContent = ready[mySide] ? text('cancelReady') : text('ready');
		if (connected) {
			setStatus(text('connected', players) + ' ' + text('readyState', {
				blue: text(ready.blue ? 'readyYes' : 'readyNo'),
				red: text(ready.red ? 'readyYes' : 'readyNo')
			}), 'connected');
		}
	}

	function resetReadyAfterHostEdit() {
		if (role !== 'host') return;
		ready.blue = false;
		ready.red = false;
		config = readForceInputs();
		durationSeconds = Number(durationSelect.value) || 900;
		renderLobbyState();
		send(lobbyPayload());
	}

	document.querySelectorAll('[data-unit]').forEach(function (input) {
		input.addEventListener('input', resetReadyAfterHostEdit);
	});
	durationSelect.addEventListener('change', resetReadyAfterHostEdit);
	joinInput.addEventListener('input', function () { joinInput.value = normalizeCode(joinInput.value); });

	function disableConnectionChoices() {
		createButton.disabled = true;
		joinButton.disabled = true;
		joinInput.disabled = true;
	}

	function enableBuilder() {
		builder.setAttribute('aria-disabled', 'false');
		builder.classList.add('is-enabled');
		writeForceInputs();
		renderForceValidation();
	}

	function bindConnection(conn) {
		if (connection && connection.open) { try { conn.close(); } catch (e) { } return; }
		connection = conn;
		connection.on('open', function () {
			connected = true;
			enableBuilder();
			if (role === 'guest') {
				send({ type: 'hello', name: playerName });
			} else {
				players.red = String((connection.metadata && connection.metadata.name) || text('red'));
				send(lobbyPayload());
			}
			renderLobbyState();
		});
		connection.on('data', handleMessage);
		connection.on('close', handleDisconnect);
		connection.on('error', function (error) {
			setStatus(text('connectionFail', { reason: error.message || error.type || String(error) }), 'error');
		});
	}

	function peerError(error) {
		var reason = error && (error.message || error.type) ? (error.message || error.type) : String(error || 'unknown');
		setStatus(text('connectionFail', { reason: reason }), 'error');
		createButton.disabled = false;
		joinButton.disabled = false;
		joinInput.disabled = false;
	}

	function createHostWithCode(code, collisionRetry) {
		roomCode = code;
		var id = 'napoleon-field-v1-' + code.toLowerCase();
		peer = new window.Peer(id, { debug: 1 });
		peer.on('open', function () {
			roomCodeNode.textContent = roomCode;
			roomShare.hidden = false;
			setStatus(text('waitingOpponent', { code: roomCode }), 'waiting');
			enableBuilder();
		});
		peer.on('connection', bindConnection);
		peer.on('error', function (error) {
			if (error && error.type === 'unavailable-id' && collisionRetry < 3) {
				try { peer.destroy(); } catch (e) { }
				createHostWithCode(randomCode(), collisionRetry + 1);
				return;
			}
			peerError(error);
		});
	}

	createButton.addEventListener('click', function () {
		role = 'host';
		mySide = 'blue';
		players.blue = playerName;
		disableConnectionChoices();
		setStatus(text('loadingService'), 'waiting');
		loadPeerLibrary().then(function () { createHostWithCode(randomCode(), 0); }).catch(function () {
			setStatus(text('serviceFail'), 'error');
			createButton.disabled = false;
			joinButton.disabled = false;
			joinInput.disabled = false;
		});
	});

	joinButton.addEventListener('click', function () {
		var code = normalizeCode(joinInput.value);
		if (code.length !== 6) { setStatus(text('invalidCode'), 'error'); joinInput.focus(); return; }
		role = 'guest';
		mySide = 'red';
		roomCode = code;
		players.red = playerName;
		disableConnectionChoices();
		setStatus(text('joining', { code: code }), 'waiting');
		loadPeerLibrary().then(function () {
			peer = new window.Peer(undefined, { debug: 1 });
			peer.on('open', function () {
				var hostId = 'napoleon-field-v1-' + code.toLowerCase();
				bindConnection(peer.connect(hostId, { reliable: true, metadata: { name: playerName } }));
			});
			peer.on('error', peerError);
		}).catch(function () {
			setStatus(text('serviceFail'), 'error');
			createButton.disabled = false;
			joinButton.disabled = false;
			joinInput.disabled = false;
		});
	});

	document.getElementById('mp-copy').addEventListener('click', function () {
		var url = new URL(window.location.href);
		url.search = '';
		url.searchParams.set('room', roomCode);
		var invite = text('title') + ' · ' + text('roomCode') + ' ' + roomCode + '\n' + url.toString();
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(invite).then(function () {
				if (typeof toast === 'function') toast(text('copied'));
			}).catch(function () { if (typeof toast === 'function') toast(text('copyFail', { code: roomCode })); });
		} else if (typeof toast === 'function') toast(text('copyFail', { code: roomCode }));
	});

	readyButton.addEventListener('click', function () {
		if (!connected || !renderForceValidation()) return;
		ready[mySide] = !ready[mySide];
		if (role === 'host') {
			send(lobbyPayload());
			renderLobbyState();
			maybeStartMatch();
		} else {
			send({ type: 'ready', value: ready.red });
			renderLobbyState();
		}
	});

	function handleMessage(message) {
		if (!message || typeof message !== 'object' || !message.type) return;
		if (message.type === 'hello' && role === 'host') {
			players.red = String(message.name || text('red')).slice(0, 40);
			send(lobbyPayload());
			renderLobbyState();
			return;
		}
		if (message.type === 'lobby-state' && role === 'guest' && phase === 'lobby') {
			config = Object.assign({}, DEFAULT_FORCE, message.config || {});
			durationSeconds = Number(message.duration) || 900;
			ready = Object.assign({ blue: false, red: false }, message.ready || {});
			players = Object.assign({ blue: text('blue'), red: playerName }, message.players || {});
			players.red = playerName;
			enableBuilder();
			renderLobbyState();
			return;
		}
		if (message.type === 'ready' && role === 'host' && phase === 'lobby') {
			ready.red = !!message.value;
			send(lobbyPayload());
			renderLobbyState();
			maybeStartMatch();
			return;
		}
		if (message.type === 'start' && role === 'guest') {
			beginMatch(message);
			return;
		}
		if (message.type === 'orders' && role === 'host' && phase === 'battle') {
			handleGuestOrders(message);
			return;
		}
		if (message.type === 'turn' && role === 'guest' && phase === 'battle') {
			applyAuthoritativeTurn(message);
			return;
		}
		if (message.type === 'timeout-request' && role === 'host' && phase === 'battle') {
			if (Date.now() >= matchEndAt - 1000) finishMatch('time');
			return;
		}
		if (message.type === 'finish') showResult(message.result);
	}

	function handleDisconnect() {
		connected = false;
		if (phase === 'battle' && !finished) {
			endTurnButton.disabled = true;
			var hint = document.getElementById('mp-command-hint');
			if (hint) hint.textContent = text('disconnected');
			if (typeof modalNotice === 'function') modalNotice(text('disconnected'));
		} else if (phase === 'lobby') {
			setStatus(text('disconnected'), 'error');
		}
	}

	function rollDie() {
		var value = new Uint32Array(1);
		if (window.crypto && window.crypto.getRandomValues) { window.crypto.getRandomValues(value); return (value[0] % 6) + 1; }
		return Math.floor(Math.random() * 6) + 1;
	}

	function maybeStartMatch() {
		if (role !== 'host' || !connected || !ready.blue || !ready.red || !forceStats(config).valid) return;
		var blueDie = rollDie();
		var redDie = rollDie();
		while (blueDie === redDie) { blueDie = rollDie(); redDie = rollDie(); }
		var first = blueDie > redDie ? 'blue' : 'red';
		var startAt = Date.now() + 2400;
		var payload = {
			type: 'start',
			config: Object.assign({}, config),
			players: Object.assign({}, players),
			blueDie: blueDie,
			redDie: redDie,
			state: makeInitialState(first),
			startAt: startAt,
			endAt: startAt + durationSeconds * 1000
		};
		send(payload);
		beginMatch(payload);
	}

	function formationPositions(count, side) {
		var result = [];
		for (var i = 0; i < count; i++) {
			var column = Math.floor(i / 6);
			var slot = i % 6;
			var inColumn = Math.min(6, count - column * 6);
			var y = (slot + 1) * 9 / (inColumn + 1);
			var x = side === 'blue' ? (0.55 + column * 0.78) : (8.45 - column * 0.78);
			result.push({ x: x, y: y });
		}
		return result;
	}

	function makeUnitsForSide(side) {
		var types = [];
		UNIT_ORDER.forEach(function (type) {
			for (var i = 0; i < (Number(config[type]) || 0); i++) types.push(type);
		});
		var positions = formationPositions(types.length, side);
		var typeCounts = {};
		return types.map(function (type, index) {
			var def = UNIT_DEFS[type];
			typeCounts[type] = (typeCounts[type] || 0) + 1;
			var pos = positions[index];
			return {
				id: side + '-' + index,
				color: side,
				type: type,
				cls: def.cls,
				index: typeCounts[type],
				posx: pos.x,
				posy: pos.y,
				targetx: pos.x,
				targety: pos.y,
				followTargetId: '',
				speed: def.speed,
				atkrange: def.range,
				atk: def.atk,
				lp: def.lp,
				lpMax: def.lp,
				disabled: false
			};
		});
	}

	function makeInitialState(first) {
		return { units: makeUnitsForSide('blue').concat(makeUnitsForSide('red')), activeSide: first, turn: 1 };
	}

	function beginMatch(payload) {
		phase = 'dice';
		config = Object.assign({}, DEFAULT_FORCE, payload.config || {});
		players = Object.assign({}, players, payload.players || {});
		battleState = payload.state;
		matchEndAt = Number(payload.endAt) || (Date.now() + durationSeconds * 1000);
		lobby.hidden = true;
		diceStage.hidden = false;
		diceStage.classList.remove('is-settled');
		document.getElementById('mp-blue-die').textContent = '?';
		document.getElementById('mp-red-die').textContent = '?';
		document.getElementById('mp-dice-result').textContent = '';
		window.setTimeout(function () {
			document.getElementById('mp-blue-die').textContent = String(payload.blueDie);
			document.getElementById('mp-red-die').textContent = String(payload.redDie);
			document.getElementById('mp-dice-result').textContent = text(payload.blueDie > payload.redDie ? 'blueFirst' : 'redFirst', {
				blue: payload.blueDie, red: payload.redDie
			});
			diceStage.classList.add('is-settled');
		}, 820);
		var wait = Math.max(1900, (Number(payload.startAt) || Date.now() + 2200) - Date.now());
		window.setTimeout(showBattle, wait);
	}

	function initBoard() {
		if (board.dataset.ready === 'true') return;
		board.dataset.ready = 'true';
		for (var row = 0; row < 10; row++) {
			for (var col = 0; col < 10; col++) {
				var cell = document.createElement('span');
				cell.className = 'mp-cell';
				cell.setAttribute('aria-hidden', 'true');
				board.appendChild(cell);
			}
		}
		board.addEventListener('click', onBoardClick);
	}

	function showBattle() {
		phase = 'battle';
		diceStage.hidden = true;
		battle.hidden = false;
		initBoard();
		renderBattle();
		if (timerId) window.clearInterval(timerId);
		timerId = window.setInterval(updateClock, 250);
		updateClock();
	}

	function unitName(unit) { return text(unit.type || 'infantry'); }
	function aliveUnits(side) {
		return battleState ? battleState.units.filter(function (unit) { return unit.color === side && !unit.disabled; }) : [];
	}
	function findUnit(id) {
		return battleState ? battleState.units.find(function (unit) { return unit.id === id; }) : null;
	}
	function ownTurn() {
		return phase === 'battle' && !waitingForHost && battleState && battleState.activeSide === mySide && connected && !finished;
	}

	function pieceImage(unit) {
		if (unit.color === 'red' && unit.type === 'skirmisher') return 'img/blue_skirmisher.webp';
		return 'img/' + unit.color + '_' + unit.type + '.webp';
	}

	function renderBattle() {
		if (!battleState || phase !== 'battle') return;
		selectedIds = selectedIds.filter(function (id) { var unit = findUnit(id); return unit && !unit.disabled && unit.color === mySide; });
		board.querySelectorAll('.mp-piece, .mp-order-layer').forEach(function (node) { node.remove(); });
		battleState.units.forEach(function (unit) {
			if (unit.disabled) return;
			var piece = document.createElement('button');
			piece.type = 'button';
			piece.className = 'mp-piece mp-piece--' + unit.color + ' mp-piece--' + unit.type + (selectedIds.indexOf(unit.id) >= 0 ? ' is-selected' : '');
			piece.dataset.unitId = unit.id;
			piece.style.left = (unit.posx / 9 * 100) + '%';
			piece.style.top = (unit.posy / 9 * 100) + '%';
			piece.title = unitName(unit) + ' ' + unit.index;
			var image = document.createElement('img');
			image.src = pieceImage(unit);
			image.alt = piece.title;
			image.draggable = false;
			var badge = document.createElement('span');
			badge.className = 'mp-piece__badge';
			badge.textContent = unit.cls;
			var health = document.createElement('span');
			health.className = 'mp-piece__health';
			health.style.setProperty('--health', Math.max(0, Math.min(100, unit.lp / unit.lpMax * 100)) + '%');
			piece.appendChild(image);
			piece.appendChild(badge);
			piece.appendChild(health);
			board.appendChild(piece);
		});
		renderOrderArrows();
		renderRosters();
		renderSelectedDetail();
		renderBattleHud();
	}

	function renderOrderArrows() {
		var layer = document.createElement('div');
		layer.className = 'mp-order-layer';
		var width = board.clientWidth || 600;
		var height = board.clientHeight || 600;
		battleState.units.forEach(function (unit) {
			if (unit.disabled) return;
			var target = unit.followTargetId ? findUnit(unit.followTargetId) : null;
			var tx = target && !target.disabled ? target.posx : unit.targetx;
			var ty = target && !target.disabled ? target.posy : unit.targety;
			var x1 = unit.posx / 9 * width;
			var y1 = unit.posy / 9 * height;
			var x2 = tx / 9 * width;
			var y2 = ty / 9 * height;
			var dx = x2 - x1;
			var dy = y2 - y1;
			var length = Math.sqrt(dx * dx + dy * dy);
			if (length < 5) return;
			var arrow = document.createElement('span');
			arrow.className = 'mp-order-arrow mp-order-arrow--' + unit.color;
			arrow.style.left = x1 + 'px';
			arrow.style.top = y1 + 'px';
			arrow.style.width = length + 'px';
			arrow.style.transform = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg)';
			layer.appendChild(arrow);
		});
		board.appendChild(layer);
	}

	function renderRosters() {
		['blue', 'red'].forEach(function (side) {
			var roster = document.getElementById('mp-' + side + '-roster');
			roster.innerHTML = '';
			var heading = document.createElement('h3');
			heading.textContent = text(side) + ' · ' + aliveUnits(side).length;
			roster.appendChild(heading);
			aliveUnits(side).forEach(function (unit) {
				var row = document.createElement('button');
				row.type = 'button';
				row.className = 'mp-roster-row' + (selectedIds.indexOf(unit.id) >= 0 ? ' is-selected' : '');
				row.dataset.unitId = unit.id;
				row.disabled = side !== mySide || !ownTurn();
				var name = document.createElement('span');
				name.textContent = unitName(unit) + ' ' + unit.index;
				var hp = document.createElement('small');
				hp.textContent = Math.max(0, Math.ceil(unit.lp)) + '/' + unit.lpMax;
				var bar = document.createElement('i');
				bar.style.setProperty('--health', Math.max(0, Math.min(100, unit.lp / unit.lpMax * 100)) + '%');
				row.appendChild(name);
				row.appendChild(hp);
				row.appendChild(bar);
				row.addEventListener('click', function (event) { selectUnit(unit, event.ctrlKey || event.shiftKey); });
				roster.appendChild(row);
			});
		});
	}

	function renderSelectedDetail() {
		var detail = document.getElementById('mp-selected-detail');
		var unit = selectedIds.length ? findUnit(selectedIds[0]) : null;
		if (!unit || unit.disabled) { detail.hidden = true; detail.textContent = ''; return; }
		detail.hidden = false;
		detail.textContent = text('selectedDetail', {
			name: unitName(unit), index: unit.index, hp: Math.ceil(unit.lp), max: unit.lpMax,
			range: unit.atkrange, atk: unit.atk, speed: unit.speed
		});
	}

	function renderBattleHud() {
		if (!battleState || phase !== 'battle') return;
		document.getElementById('mp-blue-player').textContent = players.blue || text('blue');
		document.getElementById('mp-red-player').textContent = players.red || text('red');
		document.getElementById('mp-blue-count').textContent = String(aliveUnits('blue').length);
		document.getElementById('mp-red-count').textContent = String(aliveUnits('red').length);
		var sideLabel = text(battleState.activeSide);
		document.getElementById('mp-turn-label').textContent = text(ownTurn() ? 'myTurn' : 'theirTurn', { turn: battleState.turn, side: sideLabel });
		endTurnButton.disabled = !ownTurn();
		endTurnButton.textContent = text('endTurn');
	}

	function selectUnit(unit, additive) {
		if (!ownTurn() || unit.color !== mySide || unit.disabled) return;
		var at = selectedIds.indexOf(unit.id);
		if (additive) {
			if (at >= 0) selectedIds.splice(at, 1); else selectedIds.push(unit.id);
		} else selectedIds = [unit.id];
		renderBattle();
	}

	function onBoardClick(event) {
		if (!ownTurn()) return;
		var pieceNode = event.target.closest('.mp-piece');
		if (pieceNode) {
			var unit = findUnit(pieceNode.dataset.unitId);
			if (!unit || unit.disabled) return;
			if (unit.color === mySide) { selectUnit(unit, event.ctrlKey || event.shiftKey); return; }
			if (selectedIds.length) issueOrder(unit.posx, unit.posy, unit);
			return;
		}
		if (!selectedIds.length) return;
		var rect = board.getBoundingClientRect();
		var x = Math.max(0, Math.min(9, (event.clientX - rect.left) / rect.width * 9));
		var y = Math.max(0, Math.min(9, (event.clientY - rect.top) / rect.height * 9));
		issueOrder(x, y, null);
	}

	function issueOrder(x, y, follow) {
		var count = selectedIds.length;
		selectedIds.forEach(function (id) {
			var unit = findUnit(id);
			if (!unit || unit.disabled || unit.color !== mySide) return;
			unit.targetx = x;
			unit.targety = y;
			unit.followTargetId = follow ? follow.id : '';
		});
		var hint = document.getElementById('mp-command-hint');
		hint.textContent = follow
			? text('orderFollow', { count: count, target: unitName(follow) + ' ' + follow.index })
			: text('orderGround', { count: count });
		selectedIds = [];
		renderBattle();
	}

	function distance(a, b) {
		var dx = a.posx - b.posx;
		var dy = a.posy - b.posy;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function nearestEnemy(unit) {
		var enemies = battleState.units.filter(function (other) { return other.color !== unit.color && !other.disabled; });
		var nearest = null;
		var nearestDistance = Infinity;
		enemies.forEach(function (enemy) {
			var d = distance(unit, enemy);
			if (d < nearestDistance) { nearest = enemy; nearestDistance = d; }
		});
		return nearest;
	}

	function clearPosition(unit, x, y) {
		return battleState.units.every(function (other) {
			if (other === unit || other.disabled) return true;
			var dx = x - other.posx;
			var dy = y - other.posy;
			return Math.sqrt(dx * dx + dy * dy) >= 0.54;
		});
	}

	function safeMove(unit, startX, startY, desiredX, desiredY) {
		desiredX = Math.max(0, Math.min(9, desiredX));
		desiredY = Math.max(0, Math.min(9, desiredY));
		if (clearPosition(unit, desiredX, desiredY)) return { x: desiredX, y: desiredY };
		var dx = desiredX - startX;
		var dy = desiredY - startY;
		var len = Math.sqrt(dx * dx + dy * dy) || 1;
		var angles = [55, -55, 90, -90];
		for (var i = 0; i < angles.length; i++) {
			var rad = angles[i] * Math.PI / 180;
			var vx = (dx / len) * Math.cos(rad) - (dy / len) * Math.sin(rad);
			var vy = (dx / len) * Math.sin(rad) + (dy / len) * Math.cos(rad);
			var candidate = { x: Math.max(0, Math.min(9, startX + vx * len)), y: Math.max(0, Math.min(9, startY + vy * len)) };
			if (clearPosition(unit, candidate.x, candidate.y)) return candidate;
		}
		return { x: startX, y: startY };
	}

	function simulateSide(side) {
		for (var frame = 0; frame < 24; frame++) {
			battleState.units.filter(function (unit) { return unit.color === side && !unit.disabled; }).forEach(function (unit) {
				var tracked = unit.followTargetId ? findUnit(unit.followTargetId) : null;
				if (tracked && !tracked.disabled) { unit.targetx = tracked.posx; unit.targety = tracked.posy; }
				else if (unit.followTargetId) unit.followTargetId = '';
				var enemy = nearestEnemy(unit);
				if (!enemy) return;
				var combatRange = Math.max(Number(unit.atkrange) || 0, 0.58);
				var inRange = distance(unit, enemy) < combatRange;
				var moveX = unit.targetx - unit.posx;
				var moveY = unit.targety - unit.posy;
				var enemyX = enemy.posx - unit.posx;
				var enemyY = enemy.posy - unit.posy;
				var atTarget = Math.abs(moveX) < 0.000001 && Math.abs(moveY) < 0.000001;
				if (inRange && (atTarget || moveX * enemyX + moveY * enemyY >= 0)) {
					enemy.lp = Math.max(0, enemy.lp - unit.atk);
					if (enemy.lp <= 0) enemy.disabled = true;
					return;
				}
				var remaining = Math.sqrt(moveX * moveX + moveY * moveY);
				if (remaining < 0.000001) return;
				var travel = Math.min(unit.speed, remaining);
				var desiredX = unit.posx + moveX / remaining * travel;
				var desiredY = unit.posy + moveY / remaining * travel;
				var safe = safeMove(unit, unit.posx, unit.posy, desiredX, desiredY);
				unit.posx = safe.x;
				unit.posy = safe.y;
			});
		}
	}

	function sanitizedOrders(message) {
		return Array.isArray(message.orders) ? message.orders.slice(0, 18) : [];
	}

	function applyOrders(side, orders) {
		orders.forEach(function (order) {
			var unit = findUnit(String(order.id || ''));
			if (!unit || unit.color !== side || unit.disabled) return;
			unit.targetx = Math.max(0, Math.min(9, Number(order.targetx) || 0));
			unit.targety = Math.max(0, Math.min(9, Number(order.targety) || 0));
			var target = order.followTargetId ? findUnit(String(order.followTargetId)) : null;
			unit.followTargetId = target && target.color !== side && !target.disabled ? target.id : '';
		});
	}

	function exportOrders(side) {
		return battleState.units.filter(function (unit) { return unit.color === side && !unit.disabled; }).map(function (unit) {
			return { id: unit.id, targetx: unit.targetx, targety: unit.targety, followTargetId: unit.followTargetId || '' };
		});
	}

	function handleGuestOrders(message) {
		if (!battleState || battleState.activeSide !== 'red' || message.side !== 'red') return;
		applyOrders('red', sanitizedOrders(message));
		authoritativeTurn('red');
	}

	function authoritativeTurn(side) {
		if (role !== 'host' || !battleState || battleState.activeSide !== side || finished) return;
		simulateSide(side);
		battleState.activeSide = side === 'blue' ? 'red' : 'blue';
		battleState.turn += 1;
		waitingForHost = false;
		selectedIds = [];
		var message = {
			type: 'turn',
			state: JSON.parse(JSON.stringify(battleState)),
			remainingMs: Math.max(0, matchEndAt - Date.now())
		};
		send(message);
		renderBattle();
		adjudicateElimination();
	}

	function applyAuthoritativeTurn(message) {
		if (!message.state || !Array.isArray(message.state.units)) return;
		battleState = message.state;
		matchEndAt = Date.now() + Math.max(0, Number(message.remainingMs) || 0);
		waitingForHost = false;
		selectedIds = [];
		renderBattle();
		adjudicateElimination();
	}

	endTurnButton.addEventListener('click', function () {
		if (!ownTurn()) return;
		endTurnButton.disabled = true;
		selectedIds = [];
		if (role === 'host') {
			authoritativeTurn('blue');
		} else {
			waitingForHost = true;
			send({ type: 'orders', side: 'red', orders: exportOrders('red') });
			document.getElementById('mp-command-hint').textContent = text('resolving');
			renderBattleHud();
		}
	});

	function adjudicateElimination() {
		if (!battleState || finished) return;
		var blue = aliveUnits('blue').length;
		var red = aliveUnits('red').length;
		if (blue > 0 && red > 0) return;
		if (role === 'host') finishMatch('elimination');
	}

	function healthRatio(side) {
		var all = battleState.units.filter(function (unit) { return unit.color === side; });
		var max = all.reduce(function (sum, unit) { return sum + unit.lpMax; }, 0) || 1;
		var current = all.reduce(function (sum, unit) { return sum + Math.max(0, unit.lp); }, 0);
		return current / max;
	}

	function buildResult(reason) {
		var blue = aliveUnits('blue').length;
		var red = aliveUnits('red').length;
		var winner = '';
		if (blue !== red) winner = blue > red ? 'blue' : 'red';
		else {
			var blueHealth = healthRatio('blue');
			var redHealth = healthRatio('red');
			if (Math.abs(blueHealth - redHealth) > 0.0001) winner = blueHealth > redHealth ? 'blue' : 'red';
		}
		return { winner: winner, reason: reason, blue: blue, red: red };
	}

	function finishMatch(reason) {
		if (role !== 'host' || finished) return;
		var result = buildResult(reason);
		send({ type: 'finish', result: result });
		showResult(result);
	}

	function showResult(result) {
		if (finished) return;
		finished = true;
		phase = 'finished';
		if (timerId) window.clearInterval(timerId);
		endTurnButton.disabled = true;
		var panel = document.getElementById('mp-result');
		var title = document.getElementById('mp-result-title');
		var copy = document.getElementById('mp-result-copy');
		panel.dataset.winner = result.winner || 'draw';
		title.textContent = text(result.winner ? (result.winner + 'Win') : 'draw');
		if (!result.winner) copy.textContent = text('resultDraw');
		else if (result.reason === 'elimination') copy.textContent = text('resultElimination', {
			winner: text(result.winner), blue: result.blue, red: result.red
		});
		else copy.textContent = text('resultTime', { blue: result.blue, red: result.red });
		panel.hidden = false;
	}

	function updateClock() {
		if (!battleState || phase !== 'battle' || finished) return;
		var remaining = Math.max(0, matchEndAt - Date.now());
		var totalSeconds = Math.ceil(remaining / 1000);
		var minutes = Math.floor(totalSeconds / 60);
		var seconds = totalSeconds % 60;
		document.getElementById('mp-clock').textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
		if (remaining > 0) return;
		endTurnButton.disabled = true;
		if (role === 'host') finishMatch('time');
		else {
			document.getElementById('mp-command-hint').textContent = text('timeoutWait');
			send({ type: 'timeout-request' });
		}
	}

	window.addEventListener('resize', function () { if (phase === 'battle') renderBattle(); });
	window.addEventListener('ui:languagechange', renderLanguage);
	window.addEventListener('beforeunload', function () {
		try { if (connection) connection.close(); } catch (e) { }
		try { if (peer) peer.destroy(); } catch (e) { }
	});

	var invitedCode = normalizeCode(new URLSearchParams(window.location.search).get('room'));
	if (invitedCode.length === 6) {
		joinInput.value = invitedCode;
		window.setTimeout(function () { joinButton.click(); }, 360);
	}

	config = readForceInputs();
	renderLanguage();
	if (typeof initBgm === 'function') initBgm('multiplayer-music');
})();

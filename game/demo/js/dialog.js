/* 剧情对话引擎（UI 扩展版）。
 * playDialogue(lines, onDone)：按序播放对白，结束后调用 onDone。
 *
 * 每句对白至少需要 { who, text }，还可以按需添加：
 * side: 'left' | 'right'     说话人所在一侧
 * portrait: '图片路径'       人物立绘（不填时沿用该侧上一张）
 * role: '人物身份'           显示在姓名旁的小字
 * chapter: '章节标题'        画面上方的章节名
 * location: '地点 · 年份'    章节名下方的小字
 * kind: 'briefing'           将该页显示为战役简报
 * actionLabel: '按钮文字'    自定义该页的按钮文字
 */
function playDialogue(lines, onDone) {
	if (!lines || !lines.length) { if (onDone) onDone(); return; }
	const localize = function (value) {
		return (typeof uiLocalize === 'function') ? uiLocalize(value) : (value || '');
	};
	const translate = function (key, fallback) {
		return (typeof uiT === 'function') ? uiT(key) : fallback;
	};

	const overlay = document.createElement('div');
	overlay.className = 'dialog-overlay';
	overlay.setAttribute('role', 'dialog');
	overlay.setAttribute('aria-modal', 'true');
	overlay.setAttribute('aria-label', translate('dialogue.label', '战前剧情'));

	const chapter = document.createElement('div');
	chapter.className = 'dialog-chapter';
	const chapterName = document.createElement('strong');
	const chapterLocation = document.createElement('span');
	chapter.appendChild(chapterName);
	chapter.appendChild(chapterLocation);

	function makePortrait(side) {
		const holder = document.createElement('div');
		holder.className = 'dialog-portrait dialog-portrait--' + side + ' is-empty';
		const img = document.createElement('img');
		img.alt = '';
		img.draggable = false;
		holder.appendChild(img);
		overlay.appendChild(holder);
		return { holder: holder, img: img, source: '' };
	}

	const portraits = {
		left: makePortrait('left'),
		right: makePortrait('right')
	};

	const box = document.createElement('div');
	box.className = 'dialog-box';
	const crest = document.createElement('div');
	crest.className = 'dialog-crest';
	crest.setAttribute('aria-hidden', 'true');
	const crestMonogram = document.createElement('strong');
	crestMonogram.className = 'dialog-crest__monogram';
	crestMonogram.textContent = 'N';
	const crestLabel = document.createElement('span');
	crestLabel.className = 'dialog-crest__label';
	crestLabel.textContent = 'GRANDE ARMÉE';
	crest.appendChild(crestMonogram);
	crest.appendChild(crestLabel);

	const paper = document.createElement('div');
	paper.className = 'dialog-paper';

	const heading = document.createElement('div');
	heading.className = 'dialog-heading';
	const identity = document.createElement('div');
	identity.className = 'dialog-identity';
	const who = document.createElement('div');
	who.className = 'dialog-who';
	const role = document.createElement('div');
	role.className = 'dialog-role';
	const progress = document.createElement('div');
	progress.className = 'dialog-progress';
	identity.appendChild(who);
	identity.appendChild(role);
	heading.appendChild(identity);
	heading.appendChild(progress);

	const text = document.createElement('div');
	text.className = 'dialog-text';
	text.setAttribute('aria-live', 'polite');
	const next = document.createElement('button');
	next.type = 'button';
	next.className = 'game-btn dialog-next';
	next.textContent = '继续';

	paper.appendChild(heading);
	paper.appendChild(text);
	box.appendChild(crest);
	box.appendChild(paper);
	box.appendChild(next);
	overlay.appendChild(chapter);
	overlay.appendChild(box);

	/* 预先找到左右两侧第一次出现的立绘，让开场第一帧就能两侧站人。 */
	lines.forEach(function (line) {
		const side = line.side === 'right' ? 'right' : 'left';
		if (line.portrait && !portraits[side].source) {
			portraits[side].source = line.portrait;
			portraits[side].img.src = line.portrait;
			portraits[side].img.alt = localize(line.who) || translate('dialogue.character', '剧情人物');
			portraits[side].holder.classList.remove('is-empty');
		}
	});

	let i = 0;
	function inferPortraitAction(line, index) {
		if (line.action) return line.action;
		const identity = String(line.who || '') + ' ' + String(line.role || '');
		if (/传令|副官|通讯|上士|report|courier|aide/i.test(identity)) return 'report';
		if (/联军|coalition|防线/i.test(identity)) return 'challenge';
		return index % 2 === 0 ? 'command' : 'resolve';
	}

	function show(j) {
		const line = lines[j] || {};
		const side = line.side === 'right' ? 'right' : 'left';
		const isBriefing = line.kind === 'briefing';

		if (line.portrait) {
			portraits[side].source = line.portrait;
			portraits[side].img.src = line.portrait;
			portraits[side].img.alt = localize(line.who) || translate('dialogue.character', '剧情人物');
			portraits[side].holder.classList.remove('is-empty');
		}

		const action = inferPortraitAction(line, j);
		['left', 'right'].forEach(function (position) {
			const holder = portraits[position].holder;
			const speaking = !isBriefing && position === side;
			holder.classList.toggle('is-speaking', speaking);
			holder.classList.toggle('is-listening', isBriefing || position !== side);
			holder.classList.remove('is-gesturing', 'is-reacting', 'is-action-command', 'is-action-report', 'is-action-challenge', 'is-action-resolve');
			if (speaking) {
				/* 每句按身份切换动作：下令 / 汇报 / 对峙 / 沉思，避免所有人物统一弹一下。 */
				void holder.offsetWidth;
				holder.classList.add('is-gesturing', 'is-action-' + action);
			} else if (!holder.classList.contains('is-empty')) {
				void holder.offsetWidth;
				holder.classList.add('is-reacting');
			}
		});

		overlay.dataset.scene = line.scene || 'campaign';
		box.classList.toggle('dialog-box--briefing', isBriefing);
		crest.classList.toggle('dialog-crest--briefing', isBriefing);
		crestMonogram.textContent = isBriefing ? '✦' : 'N';
		chapterName.textContent = localize(line.chapter) || translate('dialogue.campaign', '帝国战记');
		chapterLocation.textContent = localize(line.location);
		who.textContent = localize(line.who);
		role.textContent = localize(line.role);
		text.textContent = localize(line.text);
		progress.textContent = String(j + 1).padStart(2, '0') + ' / ' + String(lines.length).padStart(2, '0');
		next.textContent = localize(line.actionLabel) || translate(j === lines.length - 1 ? 'dialogue.finish' : 'dialogue.continue', j === lines.length - 1 ? '完成' : '继续');
		overlay.setAttribute('aria-label', translate('dialogue.label', '剧情对话'));

		/* 姓名和正文逐句淡入，切换语言时也会立即刷新。 */
		box.classList.remove('is-line-entering');
		void box.offsetWidth;
		box.classList.add('is-line-entering');
	}

	function finish() {
		window.removeEventListener('ui:languagechange', refreshLanguage);
		document.body.classList.remove('dialogue-active');
		overlay.remove();
		if (onDone) onDone();
	}

	function advance() {
		i += 1;
		if (i < lines.length) { show(i); return; }
		finish();
	}

	/* 背景音乐：进对话就先尝试播放；被浏览器拦下才退回"点这个按钮才播"
	   —— 游戏页原本的触发点就是这个"继续"按钮（js/bgm.js）。 */
	if (typeof initBgm === 'function') initBgm('game-music', next);

	next.addEventListener('click', function (e) {
		e.stopPropagation();
		advance();
	});

	function refreshLanguage() { show(i); }
	window.addEventListener('ui:languagechange', refreshLanguage);

	document.body.classList.add('dialogue-active');
	document.body.appendChild(overlay);
	show(0);
	next.focus();
}

const KEY = 'memo_app.memos.v1';

const input = document.getElementById('input');
const saveBtn = document.getElementById('save');
const cancelBtn = document.getElementById('cancel');
const list = document.getElementById('list');
const modeText = document.getElementById('mode');

let editingId = null;
let draggingId = null;
let lastTapId = null;
let lastTapTime = 0;

function loadMemos() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((memo) => memo && typeof memo.id === 'number' && typeof memo.text === 'string')
			.map((memo) => ({
				...memo,
				updatedAt: typeof memo.updatedAt === 'number' ? memo.updatedAt : memo.id,
			}));
	} catch (error) {
		console.error('loadMemos failed', error);
		return [];
	}
}

function saveMemos(memos) {
	try {
		localStorage.setItem(KEY, JSON.stringify(memos));
	} catch (error) {
		console.error('saveMemos failed', error);
		throw error;
	}
}

function resetEditor() {
	editingId = null;
	input.value = '';
	saveBtn.textContent = '保存';
	cancelBtn.hidden = true;
	modeText.textContent = '新しいメモを作成できます。';
	input.focus();
}

function startEdit(memo) {
	editingId = memo.id;
	input.value = memo.text;
	saveBtn.textContent = '更新';
	cancelBtn.hidden = false;
	modeText.textContent = '編集中です。内容を修正して更新してください。';
	input.focus();
}

function handleMemoEditTrigger(memo) {
	startEdit(memo);
}

function handleTouchDoubleTap(memo) {
	const now = Date.now();
	if (lastTapId === memo.id && now - lastTapTime < 350) {
		lastTapId = null;
		lastTapTime = 0;
		handleMemoEditTrigger(memo);
		return;
	}

	lastTapId = memo.id;
	lastTapTime = now;
}

function moveMemoToIndex(draggedId, targetIndex) {
	const memos = loadMemos();
	const fromIndex = memos.findIndex((memo) => memo.id === draggedId);
	if (fromIndex < 0) return;

	const [moved] = memos.splice(fromIndex, 1);
	const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
	memos.splice(Math.max(0, Math.min(insertIndex, memos.length)), 0, moved);
	saveMemos(memos);
	render();
}

function appendDropZone(memos, index) {
	const zone = document.createElement('li');
	zone.className = 'drop-zone';
	zone.dataset.index = String(index);
	zone.textContent = index === memos.length ? 'ここに置くと最後に移動します' : 'ここに置くとこの位置へ移動します';
	zone.addEventListener('dragover', (e) => {
		e.preventDefault();
		zone.classList.add('drop-target');
		e.dataTransfer.dropEffect = 'move';
	});
	zone.addEventListener('dragleave', () => {
		zone.classList.remove('drop-target');
	});
	zone.addEventListener('drop', (e) => {
		e.preventDefault();
		zone.classList.remove('drop-target');
		const draggedId = Number(e.dataTransfer.getData('text/plain'));
		moveMemoToIndex(draggedId, index);
	});
	list.appendChild(zone);
}

function render() {
	const memos = loadMemos().sort((a, b) => b.updatedAt - a.updatedAt);
	list.innerHTML = '';

	appendDropZone(memos, 0);
	memos.forEach((memo, index) => {
		const li = document.createElement('li');
		li.draggable = true;
		li.dataset.id = String(memo.id);
		li.classList.toggle('is-dragging', draggingId === memo.id);

		li.addEventListener('dragstart', (e) => {
			draggingId = memo.id;
			li.classList.add('is-dragging');
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(memo.id));
		});

		li.addEventListener('dragend', () => {
			draggingId = null;
			li.classList.remove('is-dragging');
			list.querySelectorAll('.drop-target').forEach((node) => node.classList.remove('drop-target'));
		});

		li.addEventListener('dblclick', () => {
			handleMemoEditTrigger(memo);
		});

		li.addEventListener('touchend', () => {
			handleTouchDoubleTap(memo);
		}, { passive: true });

		const txt = document.createElement('div');
		txt.textContent = memo.text;

		const hint = document.createElement('small');
		hint.textContent = 'ドラッグで並べ替え、ダブルタップで編集できます';
		hint.className = 'drag-hint';

		const meta = document.createElement('small');
		meta.style.display = 'block';
		meta.style.opacity = '0.6';
		meta.textContent = new Date(memo.updatedAt).toLocaleString();

		const actions = document.createElement('div');
		actions.style.marginTop = '6px';
		actions.style.display = 'flex';
		actions.style.gap = '8px';

		const edit = document.createElement('button');
		edit.textContent = '編集';
		edit.addEventListener('click', () => {
			handleMemoEditTrigger(memo);
		});

		const del = document.createElement('button');
		del.textContent = '削除';
		del.addEventListener('click', () => {
			removeMemo(memo.id);
		});

		actions.appendChild(edit);
		actions.appendChild(del);
		li.appendChild(txt);
		li.appendChild(hint);
		li.appendChild(meta);
		li.appendChild(actions);
		list.appendChild(li);
		appendDropZone(memos, index + 1);
	});
}

function addMemo(text) {
	const memos = loadMemos();
	const now = Date.now();
	memos.push({ id: now, text, updatedAt: now });
	saveMemos(memos);
	render();
}

function updateMemo(id, text) {
	const now = Date.now();
	const memos = loadMemos().map((memo) => (memo.id === id ? { ...memo, text, updatedAt: now } : memo));
	saveMemos(memos);
	render();
	resetEditor();
}

function removeMemo(id) {
	let memos = loadMemos();
	memos = memos.filter((memo) => memo.id !== id);
	saveMemos(memos);
	if (editingId === id) {
		resetEditor();
	}
	render();
}

saveBtn.addEventListener('click', () => {
	const value = input.value.trim();
	if (!value) return;

	if (editingId !== null) {
		updateMemo(editingId, value);
		return;
	}

	addMemo(value);
	resetEditor();
});

cancelBtn.addEventListener('click', () => {
	resetEditor();
});

input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
		saveBtn.click();
	}
});

resetEditor();
render();

const KEY = 'memo_app.memos.v1';

const input = document.getElementById('input');
const saveBtn = document.getElementById('save');
const cancelBtn = document.getElementById('cancel');
const modeText = document.getElementById('mode');
const list = document.getElementById('list');

let editingId = null;
let draggingId = null;
let lastTapId = null;
let lastTapTime = 0;

function loadMemos(){
	try{
		const raw = localStorage.getItem(KEY);
		return raw ? JSON.parse(raw) : [];
	}catch(e){
		console.error('loadMemos', e);
		return [];
	}
}

function saveMemos(arr){
	try{
		localStorage.setItem(KEY, JSON.stringify(arr));
	}catch(e){
		console.error('saveMemos', e);
	}
}

function resetEditor(){
	editingId = null;
	input.value = '';
	saveBtn.textContent = '保存';
	cancelBtn.hidden = true;
	modeText.textContent = '新しいメモを作成できます。';
	input.focus();
}

function startEdit(memo){
	editingId = memo.id;
	input.value = memo.text;
	saveBtn.textContent = '更新';
	cancelBtn.hidden = false;
	modeText.textContent = '編集中です。内容を修正して更新してください。';
	input.focus();
}

function handleMemoEditTrigger(memo){
	startEdit(memo);
}

function handleTouchDoubleTap(memo){
	const now = Date.now();
	if (lastTapId === memo.id && (now - lastTapTime) < 350) {
		lastTapId = null;
		lastTapTime = 0;
		handleMemoEditTrigger(memo);
		return;
	}
	lastTapId = memo.id;
	lastTapTime = now;
}

function moveMemoToIndex(draggedId, targetIndex){
	const memos = loadMemos();
	const fromIndex = memos.findIndex(m => m.id === draggedId);
	if (fromIndex < 0) return;
	const [moved] = memos.splice(fromIndex, 1);
	const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
	memos.splice(insertIndex, 0, moved);
	saveMemos(memos);
	render();
}

function render(){
	list.innerHTML = '';
	const memos = loadMemos();

	const appendDropZone = (index) => {
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
	};

	appendDropZone(0);
	memos.forEach((m, index) => {
		const li = document.createElement('li');
		li.draggable = true;
		li.dataset.id = String(m.id);
		li.classList.toggle('is-dragging', draggingId === m.id);
		li.addEventListener('dragstart', (e) => {
			draggingId = m.id;
			li.classList.add('is-dragging');
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(m.id));
		});
		li.addEventListener('dragend', () => {
			draggingId = null;
			li.classList.remove('is-dragging');
			list.querySelectorAll('.drop-target').forEach(node => node.classList.remove('drop-target'));
		});
		li.addEventListener('dblclick', () => {
			handleMemoEditTrigger(m);
		});
		li.addEventListener('touchend', () => {
			handleTouchDoubleTap(m);
		}, {passive: true});
		const txt = document.createElement('div');
		txt.textContent = m.text;
		const hint = document.createElement('small');
		hint.textContent = 'ドラッグで並べ替え、ダブルタップで編集できます';
		hint.className = 'drag-hint';
		const meta = document.createElement('small');
		meta.style.display='block';
		meta.style.opacity='0.6';
		meta.textContent = new Date(m.id).toLocaleString();
		const actions = document.createElement('div');
		actions.style.marginTop='6px';
		actions.style.display='flex';
		actions.style.gap='8px';
		const del = document.createElement('button');
		del.textContent = '削除';
		del.addEventListener('click', () => {
			removeMemo(m.id);
		});
		const edit = document.createElement('button');
		edit.textContent = '編集';
		edit.addEventListener('click', () => {
			handleMemoEditTrigger(m);
		});
		actions.appendChild(edit);
		actions.appendChild(del);
		li.appendChild(txt);
		li.appendChild(hint);
		li.appendChild(meta);
		li.appendChild(actions);
		list.appendChild(li);
		appendDropZone(index + 1);
	});
}

function addMemo(text){
	const memos = loadMemos();
	memos.push({id: Date.now(), text});
	saveMemos(memos);
	render();
}

function updateMemo(id, text){
	const memos = loadMemos().map(m => m.id === id ? {...m, text} : m);
	saveMemos(memos);
	render();
	resetEditor();
}

function removeMemo(id){
	let memos = loadMemos();
	memos = memos.filter(m => m.id !== id);
	saveMemos(memos);
	if (editingId === id) {
		resetEditor();
	}
	render();
}

saveBtn.addEventListener('click', () => {
	const v = input.value.trim();
	if (!v) return;
	if (editingId !== null) {
		updateMemo(editingId, v);
		return;
	}
	addMemo(v);
	resetEditor();
});

cancelBtn.addEventListener('click', () => {
	resetEditor();
});

input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveBtn.click();
});

// 初期描画
resetEditor();
render();

const KEY = 'memo_app.memos.v1';

const input = document.getElementById('input');
const saveBtn = document.getElementById('save');
const list = document.getElementById('list');

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

function render(){
	list.innerHTML = '';
	const memos = loadMemos();
	memos.slice().reverse().forEach(m => {
		const li = document.createElement('li');
		const txt = document.createElement('div');
		txt.textContent = m.text;
		const meta = document.createElement('small');
		meta.style.display='block';
		meta.style.opacity='0.6';
		meta.textContent = new Date(m.id).toLocaleString();
		const del = document.createElement('button');
		del.textContent = '削除';
		del.style.marginTop='6px';
		del.addEventListener('click', () => {
			removeMemo(m.id);
		});
		li.appendChild(txt);
		li.appendChild(meta);
		li.appendChild(del);
		list.appendChild(li);
	});
}

function addMemo(text){
	const memos = loadMemos();
	memos.push({id: Date.now(), text});
	saveMemos(memos);
	render();
}

function removeMemo(id){
	let memos = loadMemos();
	memos = memos.filter(m => m.id !== id);
	saveMemos(memos);
	render();
}

saveBtn.addEventListener('click', () => {
	const v = input.value.trim();
	if (!v) return;
	addMemo(v);
	input.value = '';
	input.focus();
});

input.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveBtn.click();
});

// 初期描画
render();

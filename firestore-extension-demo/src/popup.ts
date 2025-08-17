function setOutput(obj: any) {
	const pre = document.getElementById('output')!;
	pre.textContent = JSON.stringify(obj, null, 2);
}

async function refresh() {
	const data = await chrome.storage.local.get(['firestoreSnippets', 'updatedAt', 'sourcePath']);
	setOutput(data.firestoreSnippets || {});
	(document.getElementById('status')!).textContent = data.updatedAt ? `Updated: ${new Date(data.updatedAt).toLocaleTimeString()}` : '';
	(document.getElementById('path')!).textContent = data.sourcePath || '';
}

chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === 'snippets-updated') refresh(); });

document.getElementById('refresh')!.addEventListener('click', refresh);

refresh();
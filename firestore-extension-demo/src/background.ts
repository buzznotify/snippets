async function ensureOffscreen() {
	try {
		const has = (chrome.offscreen && 'hasDocument' in chrome.offscreen)
			? await (chrome.offscreen as any).hasDocument()
			: false;
		if (!has) {
			await chrome.offscreen.createDocument({
				url: 'offscreen.html',
				reasons: ['DOM_PARSER'],
				justification: 'Keep Firestore websocket alive for realtime sync'
			});
		}
	} catch (err) {
		console.warn('ensureOffscreen error:', err);
	}
}

chrome.runtime.onInstalled.addListener(() => { ensureOffscreen(); });
chrome.runtime.onStartup.addListener(() => { ensureOffscreen(); });
ensureOffscreen();

chrome.runtime.onMessage.addListener((msg) => {
	if (msg?.type === 'log') console.log('[offscreen]', msg.payload);
	if (msg?.type === 'firestore-data') {
		const data = msg.payload?.data || {};
		const path = msg.payload?.path || '';
		chrome.storage.local.set({ firestoreSnippets: data, updatedAt: Date.now(), sourcePath: path });
		chrome.runtime.sendMessage({ type: 'snippets-updated' }, () => { void chrome.runtime.lastError; });
	}
});
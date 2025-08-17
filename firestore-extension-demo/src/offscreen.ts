import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection, onSnapshot, initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import rawConfig from './firebaseConfig.json' assert { type: 'json' };

const config = rawConfig as any;
const collectionPathTemplate: string = config.collectionPath || 'snippets';
const authMethod: string = config.auth?.method || 'anonymous';

const app = initializeApp(config);
// Use longPolling to avoid WebChannel transport issues behind proxies/VPNs
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const auth = getAuth(app);

try { await enableIndexedDbPersistence(db); } catch {}

async function ensureAuth(): Promise<string> {
	if (authMethod === 'anonymous') {
		const user = auth.currentUser;
		if (user) return user.uid;
		const cred = await signInAnonymously(auth);
		return cred.user.uid;
	}
	return new Promise<string>((resolve) => {
		const unsub = onAuthStateChanged(auth, (u) => { if (u) { unsub(); resolve(u.uid); } });
	});
}

function resolvePath(uid: string): string {
	return collectionPathTemplate.replace('{uid}', uid);
}

async function start(uid: string) {
	const path = resolvePath(uid);
	const colRef = collection(db, path);
	onSnapshot(colRef, (qs) => {
		const data: Record<string, any> = {};
		qs.forEach((doc) => { data[doc.id] = doc.data(); });
		chrome.runtime.sendMessage({ type: 'firestore-data', payload: { data, path } }).catch(() => {});
	}, (err) => {
		chrome.runtime.sendMessage({ type: 'log', payload: `onSnapshot error: ${err}` }).catch(() => {});
	});
}

(async () => {
	const uid = await ensureAuth();
	start(uid);
})();
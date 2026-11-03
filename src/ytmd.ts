import streamDeck from "@elgato/streamdeck";

const BASE = "http://localhost:9863/api/v1";
const APP = { appId: "ytmdarttiles", appName: "Stream Deck Art Tiles", appVersion: "0.1.0" };

type Thumb = { url: string; width: number; height: number };
type State = { video?: { id?: string; thumbnails?: Thumb[] } | null };
type Settings = { token?: string };

export type ArtListener = (art: { id: string; dataUri: string } | null) => void;

/** Polls the YTMD companion server and reports the current album art when it changes. */
export class YtmdClient {
	private listeners = new Set<ArtListener>();
	private token?: string;
	private authenticating = false;
	private nextAuthAt = 0;
	private lastId: string | null | undefined;

	onArt(listener: ArtListener): void {
		this.listeners.add(listener);
		if (this.lastArt !== undefined) listener(this.lastArt);
	}

	private lastArt: { id: string; dataUri: string } | null | undefined;

	async start(): Promise<void> {
		this.token = (await streamDeck.settings.getGlobalSettings<Settings>()).token;
		setInterval(() => void this.tick(), 2000);
	}

	private emit(art: { id: string; dataUri: string } | null): void {
		this.lastArt = art;
		for (const l of this.listeners) l(art);
	}

	private async tick(): Promise<void> {
		try {
			if (!this.token) return void (await this.authorize());

			const res = await fetch(`${BASE}/state`, { headers: { Authorization: this.token } });
			if (res.status === 401) {
				this.token = undefined;
				await streamDeck.settings.setGlobalSettings<Settings>({});
				return;
			}
			// Rate-limited or other server error: keep showing the current art.
			if (!res.ok) {
				streamDeck.logger.warn(`YTMD state request failed: ${res.status}`);
				return;
			}
			const state = (await res.json()) as State;
			const video = state.video;
			const thumb = video?.thumbnails?.reduce((a, b) => (b.width > a.width ? b : a));
			const id = video?.id ?? null;
			if (id === this.lastId) return;
			this.lastId = id;
			if (!thumb) return this.emit(null);

			streamDeck.logger.info(`new track ${id} thumb ${thumb.url} ${thumb.width}x${thumb.height}`);
			const img = await fetch(thumb.url);
			const mime = img.headers.get("content-type") ?? "image/jpeg";
			const b64 = Buffer.from(await img.arrayBuffer()).toString("base64");
			this.emit({ id: id!, dataUri: `data:${mime};base64,${b64}` });
		} catch {
			// YTMD closed or unreachable: show the idle state and retry next tick.
			if (this.lastId !== null) {
				this.lastId = null;
				this.emit(null);
			}
		}
	}

	async togglePlay(): Promise<void> {
		if (!this.token) return;
		await fetch(`${BASE}/command`, {
			method: "POST",
			headers: { Authorization: this.token, "Content-Type": "application/json" },
			body: JSON.stringify({ command: "playPause" }),
		});
	}

	/** One-time pairing; the user clicks Allow in YTMD. */
	private async authorize(): Promise<void> {
		if (this.authenticating || Date.now() < this.nextAuthAt) return;
		this.authenticating = true;
		try {
			const post = (path: string, body: object) =>
				fetch(`${BASE}${path}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
			// YTMD rate-limits pairing attempts, so never retry faster than once a minute.
			this.nextAuthAt = Date.now() + 60_000;
			const codeRes = await post("/auth/requestcode", APP);
			const codeBody = (await codeRes.json()) as { code?: string };
			if (!codeRes.ok || !codeBody.code) throw new Error(`requestcode ${codeRes.status} ${JSON.stringify(codeBody)}`);
			streamDeck.logger.info("Waiting for you to click Allow in YouTube Music Desktop...");
			const tokenRes = await post("/auth/request", { appId: APP.appId, code: codeBody.code });
			const tokenBody = (await tokenRes.json()) as { token?: string };
			if (!tokenBody.token) throw new Error(`request ${tokenRes.status} ${JSON.stringify(tokenBody)}`);
			const token = tokenBody.token;
			streamDeck.logger.info("YTMD authorized");
			this.token = token;
			await streamDeck.settings.setGlobalSettings<Settings>({ token });
		} catch (e) {
			streamDeck.logger.warn(`YTMD authorization failed: ${e}`);
		} finally {
			this.authenticating = false;
		}
	}
}

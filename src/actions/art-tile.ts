import {
	action,
	SingletonAction,
	type Action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	type WillAppearEvent,
} from "@elgato/streamdeck";
import { idleSvg, tileSvg, toDataUri, type TileSettings } from "../tiles";
import type { YtmdClient } from "../ytmd";

type Art = { id: string; dataUri: string } | null;

@action({ UUID: "com.birdtruther.ytmd-art-tiles.tile" })
export class ArtTile extends SingletonAction<TileSettings> {
	private art: Art = null;

	constructor(private readonly ytmd: YtmdClient) {
		super();
		ytmd.onArt((art) => {
			this.art = art;
			void this.refresh();
		});
	}

	override onWillAppear(ev: WillAppearEvent<TileSettings>): void {
		void this.draw(ev.action, ev.payload.settings);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<TileSettings>): void {
		void this.draw(ev.action, ev.payload.settings);
	}

	override async onKeyDown(_ev: KeyDownEvent<TileSettings>): Promise<void> {
		await this.ytmd.togglePlay();
	}

	private async refresh(): Promise<void> {
		for (const a of this.actions) {
			await this.draw(a, await a.getSettings());
		}
	}

	private async draw(a: Action<TileSettings>, settings: TileSettings): Promise<void> {
		if (!a.isKey()) return;
		const svg = this.art ? tileSvg(this.art.dataUri, settings) : idleSvg();
		await a.setImage(toDataUri(svg));
	}
}

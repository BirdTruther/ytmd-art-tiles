export type TileSettings = {
	grid?: string;
	row?: string;
	col?: string;
	/** Legacy 2x2 corner setting, kept so existing keys still work. */
	tile?: "tl" | "tr" | "bl" | "br";
};

const SIZE = 144;

/** Physical gap between keys as a fraction of one key. Skipping that slice of the art keeps the picture continuous across the bezels. */
const GAP = 0.3;

type Placement = { grid: number; row: number; col: number };

function placement(s: TileSettings): Placement {
	const grid = s.grid === "3" ? 3 : 2;
	if (s.row === undefined && s.col === undefined && s.tile) {
		return { grid, row: s.tile[0] === "b" ? 1 : 0, col: s.tile[1] === "r" ? 1 : 0 };
	}
	const clamp = (v: string | undefined) => Math.min(grid, Math.max(1, Number(v) || 1)) - 1;
	return { grid, row: clamp(s.row), col: clamp(s.col) };
}

/** Returns an SVG showing one key's share of the art, cropped square from the centre. */
export function tileSvg(dataUri: string, settings: TileSettings): string {
	const { grid, row, col } = placement(settings);
	const pitch = SIZE * (1 + GAP);
	const canvas = SIZE * (grid + GAP * (grid - 1));
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${SIZE}" height="${SIZE}" viewBox="${col * pitch} ${row * pitch} ${SIZE} ${SIZE}">` +
		`<image xlink:href="${dataUri}" x="0" y="0" width="${canvas}" height="${canvas}" preserveAspectRatio="xMidYMid slice"/>` +
		`</svg>`
	);
}

export function idleSvg(): string {
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
		`<rect width="${SIZE}" height="${SIZE}" fill="#1e1e1e"/></svg>`
	);
}

export function toDataUri(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

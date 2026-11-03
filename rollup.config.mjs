import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const sdPlugin = "com.daddy.ytmd-art-tiles.sdPlugin";

export default {
	input: "src/plugin.ts",
	output: { file: `${sdPlugin}/bin/plugin.js`, format: "es", sourcemap: true },
	plugins: [
		typescript({ tsconfig: "./tsconfig.json", outDir: `${sdPlugin}/bin`, declaration: false }),
		nodeResolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }),
		commonjs(),
		json(),
	],
};

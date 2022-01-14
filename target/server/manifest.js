export const manifest = {
	appDir: "_app",
	assets: new Set([".DS_Store","favicon.ico"]),
	_: {
		mime: {".ico":"image/vnd.microsoft.icon"},
		entry: {"file":"start-3e4d1357.js","js":["start-3e4d1357.js","chunks/vendor-f0095a1c.js"],"css":[]},
		nodes: [
			() => import('./nodes/0.js'),
			() => import('./nodes/1.js'),
			() => import('./nodes/2.js')
		],
		routes: [
			{
				type: 'page',
				pattern: /^\/$/,
				params: null,
				path: "/",
				a: [0,2],
				b: [1]
			}
		]
	}
};

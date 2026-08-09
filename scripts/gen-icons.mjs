import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

let table;
function crc32(buf) {
	if (!table) {
		table = new Int32Array(256);
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			table[n] = c;
		}
	}
	let crc = -1;
	for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
	return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const typeBuf = Buffer.from(type, 'ascii');
	const crcBuf = Buffer.alloc(4);
	crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
	return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, draw) {
	const stride = size * 4 + 1;
	const raw = Buffer.alloc(size * stride);
	for (let y = 0; y < size; y++) {
		raw[y * stride] = 0;
		for (let x = 0; x < size; x++) {
			const [r, g, b, a] = draw(x, y);
			const offset = y * stride + 1 + x * 4;
			raw[offset] = r;
			raw[offset + 1] = g;
			raw[offset + 2] = b;
			raw[offset + 3] = a;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0))
	]);
}

function iconDraw(size) {
	const cx = size / 2;
	const cy = size / 2;
	const r = size * 0.34;
	return (x, y) => {
		const dx = x - cx;
		const dy = y - cy;
		return dx * dx + dy * dy <= r * r ? [0x22, 0xc5, 0x5e, 255] : [0x0f, 0x17, 0x2a, 255];
	};
}

mkdirSync('static/icons', { recursive: true });
writeFileSync('static/icons/icon-192.png', png(192, iconDraw(192)));
writeFileSync('static/icons/icon-512.png', png(512, iconDraw(512)));
writeFileSync('static/icons/apple-touch-icon.png', png(180, iconDraw(180)));

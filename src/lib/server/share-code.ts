import { randomBytes } from 'node:crypto';

export function createShareCode() {
	let code = '';
	while (code.length < 8) {
		code += randomBytes(8).toString('base64url').replace(/[^A-Za-z0-9]/g, '');
	}
	return code.slice(0, 8);
}

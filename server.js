const express = require('express');
const path = require('path');
const templates = require('./templates');
const crypto = require('crypto');

const app = express();

app.use(express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
	const csp = {
		'default-src': `'self'`,
		'script-src': `'self' https://www.googletagmanager.com`,
		'style-src': `'self'`,
	};

	const nonce = (type) => {
		const nonce = crypto.randomBytes(128).toString('base64');
		csp[type] += ` 'nonce-${nonce}'`;
		return nonce;
	};

	const html = templates.index({
		nonce,
	});

	res.set(
		'Content-Security-Policy',
		`default-src ${csp['default-src']}; script-src ${csp['script-src']}; style-src ${csp['style-src']}`
	);

	res.send(html)
});

app.listen({
	host: '0.0.0.0',
	port: 3000,
});

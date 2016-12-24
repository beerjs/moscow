const express = require('express');
const path = require('path');
const templates = require('./templates');
const crypto = require('crypto');

const app = express();

app.use(express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
	const csp = {
		'default-src': `'self'`,
		'script-src': `'self' https://www.google-analytics.com https://mc.yandex.ru`,
		'style-src': `'self'`,
		'img-src': `'self' https://www.google-analytics.com https://mc.yandex.ru`,
		'connect-src': `'self' https://mc.yandex.ru`
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
		`default-src ${csp['default-src']}; script-src ${csp['script-src']}; style-src ${csp['style-src']}; img-src ${csp['img-src']}; connect-src ${csp['connect-src']}`
	);

	res.send(html)
});

app.listen({
	host: '0.0.0.0',
	port: 3000,
});

const express = require('express');
const path = require('path');
const templates = require('./templates');
const crypto = require('crypto');

const app = express();

app.use(express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
	const nonce = crypto.randomBytes(128).toString('base64');

	res.set(
		'Content-Security-Policy',
		`default-src 'self'; style-src 'nonce-${nonce}'`
	);

	res.send(templates.index({
		nonce,
	}))
});

app.listen({
	host: '0.0.0.0',
	port: 3000,
});

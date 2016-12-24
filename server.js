const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'assets')));

app.listen({
	host: '0.0.0.0',
	port: 3000,
});

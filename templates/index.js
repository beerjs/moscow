function ga(context) {
	return (
`<script nonce="${context.nonce('script-src')}">
	(function(){
		window.GoogleAnalyticsObject = 'ga';
		window.ga = function() {
			window.ga.q.push(arguments);
		};
		window.ga.l = new Date().getTime();
		window.ga.q = [
			['create', 'UA-89444724-1', 'auto'],
			['send', 'pageview'],
		];
		var script = document.createElement('script');
		script.async = true;
		script.src = 'https://www.google-analytics.com/analytics.js';
		document.getElementsByTagName('script')[0].parentNode.appendChild(script);
	})();
	</script>`
	);
}

function ym(context) {
	return (
`<script nonce="${context.nonce('script-src')}">
	(function() {
		window.yandex_metrika_callbacks = [
			function() {
				try {
					window.yaCounter41805634 = new Ya.Metrika({
						id: 41805634,
						clickmap: true,
						trackLinks: true,
						accurateTrackBounce: true,
						webvisor: true,
					});
				} catch(e) {}
			},
		];
		var script = document.createElement('script');
		script.async = true;
		script.src = 'https://mc.yandex.ru/metrika/watch.js';
		document.getElementsByTagName('script')[0].parentNode.appendChild(script);
	})();
	</script>`
	);
}

module.exports.index = function index(context) {
	return (
`<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>BeerJS Moscow</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#fbde34">
	<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
	<link rel="icon" type="image/png" href="favicon-32x32.png" sizes="32x32">
	<link rel="icon" type="image/png" href="favicon-16x16.png" sizes="16x16">
	<link rel="manifest" href="manifest.json">
	<link rel="mask-icon" href="safari-pinned-tab.svg">
	<meta name="description" content="Московское сообщество любителей пива и JavaScript">
	<meta name="keywords" content="beerjs, moscow, javascript">
	<style nonce="${context.nonce('style-src')}">
	html {
		background-color: #fbde34;
		height: 100%;
	}

	body {
		height: 100%;
		margin: 0;
	}

	main {
		height: 100%;
	}

	h1 {
		height: 100%;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	img {
		display: block;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		max-width: 344px;
		padding: 32px;
		z-index: 2;
	}
	</style>
	${ym(context)}
	${ga(context)}
	<meta property="og:title" content="BeerJS Moscow">
	<meta property="og:type" content="website">
	<meta property="og:url" content="https://beerjs.moscow/">
	<meta property="og:image" content="https://beerjs.moscow/og.png">
	<meta property="og:description" content="Московское сообщество любителей пива и JavaScript">
	<meta property="og:locale" content="ru_RU">
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:site" content="@beerjs_moscow">
	<meta name="twitter:title" content="BeerJS Moscow">
	<meta name="twitter:description" content="Московское сообщество любителей пива и JavaScript">
	<meta name="twitter:image" content="https://beerjs.moscow/twitter.png">
	<meta name="twitter:image:width" content="876">
	<meta name="twitter:image:height" content="440">
	<script async defer src="/bubbles.js"></script>
</head>
<body>
	<main>
		<h1><img src="beerjs.svg" alt="BeerJS Moscow"></h1>
	</main>
</body>
</html>
`
	);
}

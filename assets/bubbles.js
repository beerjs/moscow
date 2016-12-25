(function() {
	function readQueryString() {
		return window.location.search
			.slice(1)
			.split('&')
			.reduce(function(acc, param) {
				var pieces = param.split('=', 2);
				var key = decodeURIComponent(pieces[0]);
				var value = decodeURIComponent(pieces[1] || '');
				acc[key] = value;
				return acc;
			}, {});
	}

	function random(from, to) {
		var diff = to - from;
		return Math.round(Math.random() * diff) + from;
	}

	var directions = {
		UP: 0,
		DOWN: 1,
	};

	var configs = {
		lager: {
			direction: directions.UP,
			backgroundColor: '#fbde34',
			bubbleColor: '#fbf2b1',
			width: function() {
				return random(3, 7);
			},
			radius: function() {
				return random(10, 20)
			},
			speed: function() {
				return random(150, 200);
			},
			newBubbles: function() {
				return Math.random() > 0.9 ? 1 : 0;
			},
			alpha: function() {
				return 1;
			},
			amplitude: function() {
				return random(-10, 10);
			},
		},
		stout: {
			direction: directions.DOWN,
			backgroundColor: '#0F0503',
			bubbleColor: '#DFA97D',
			width: function() {
				return random(1, 2);
			},
			radius: function() {
				return random(2, 5);
			},
			speed: function() {
				return random(200, 300);
			},
			newBubbles: function() {
				return random(0, 25);
			},
			alpha: function(bubble, canvas, diff) {
				var breakpoint = canvas.height / 2 - 100;
				if (bubble.y < breakpoint) {
					return 1;
				}
				var alpha = 1 - (bubble.y - breakpoint) / 200;
				return alpha > 0 ? alpha : 0;
			},
			amplitude: function() {
				return random(-50, 50);
			},
		},
	};
	var config = configs['lager'];

	function createCanvas() {
		var canvas = document.createElement('canvas');
		canvas.width = document.body.clientWidth;
		canvas.height = document.body.clientHeight;
		canvas.style.position = 'absolute';
		canvas.style.top = '0';
		canvas.style.left = '0';
		canvas.style.zIndex = '1';
		document.body.appendChild(canvas);
		return canvas;
	}

	function runBubbles() {
		var canvas = createCanvas();
		var ctx = canvas.getContext('2d');
		var xMod = 0;
		var bubbles = null;
		var lastBubble = null;

		function _renderMenu() {
			var ul = document.createElement('ul');
			ul.style.position = 'absolute';
			ul.style.top = '15px';
			ul.style.right = '15px';
			ul.style.listStyleType = 'none';
			ul.style.margin = '0';
			ul.style.padding = '0';
			ul.style.zIndex = '2';
			Object.keys(configs).forEach(function(configName) {
				var li = document.createElement('li');
				li.style.marginBottom = '10px';
				var button = document.createElement('button');
				button.style.borderWidth = '2px';
				button.style.borderStyle = 'solid';
				button.style.borderColor = configs[configName].bubbleColor;
				button.style.borderRadius = '25px';
				button.style.backgroundColor = configs[configName].backgroundColor;
				button.style.width = '25px';
				button.style.height = '25px';
				button.style.cursor = 'pointer';
				button.addEventListener('click', function() {
					_changeConfig(configs[configName]);
					history.pushState(configName, document.title, '?beer=' + configName);
				});
				li.appendChild(button);
				ul.appendChild(li);
			});
			document.body.appendChild(ul);
		}

		function _changeConfig(newConfig) {
			var html = document.querySelector('html');
			if (html.animate) {
				var player = html.animate([
					{backgroundColor: html.style.backgroundColor || '#fbde34'},
					{backgroundColor: newConfig.backgroundColor},
				], 500);
				player.onfinish = function() {
					html.style.backgroundColor = newConfig.backgroundColor;
				};
			} else {
				html.style.backgroundColor = newConfig.backgroundColor;
			}
			bubbles = null;
			lastBubble = null;
			config = newConfig;
		}

		function _isBubbleGone(bubble) {
			if (bubble.alpha === 0) {
				return true;
			}

			if (config.direction === directions.UP) {
				return bubble.y < 0 - bubble.width - bubble.radius;
			} else {
				return bubble.y > canvas.height + bubble.width + bubble.radius;
			}
		}

		function _createBubble(timestamp) {
			var width = config.width();
			var radius = config.radius();
			var speed = config.speed();
			var amplitude = config.amplitude();
			var color = config.bubbleColor;
			var origX = random(canvas.width * -0.5, canvas.width * 1.5);
			var origY = config.direction === directions.UP
			 ? canvas.height + width + radius
			 : -(width + radius);

			return {
				origX: origX,
				origY: origY,
				x: origX,
				y: origY,
				alpha: 1,
				width: width,
				radius: radius,
				speed: speed,
				next: null,
				timestamp: timestamp,
				color: color,
				amplitude: amplitude,
				xMod: 0,
			};
		}

		function _moveBubble(bubble, newTimestamp) {
			var delta = newTimestamp - bubble.timestamp;
			var yDiff = Math.round(delta / 1000 * bubble.speed);
			bubble.alpha = config.alpha(bubble, canvas, delta);
			bubble.xMod += config.direction === directions.UP ? xMod : -xMod;
			bubble.y = config.direction === directions.UP ? bubble.origY - yDiff : bubble.origY + yDiff;
			bubble.x = bubble.origX + Math.round(Math.sin(delta / 1000) * bubble.amplitude + bubble.xMod);
		}

		function _cleanup() {
			var current = bubbles;
			var previous;
			while (current) {
				if (_isBubbleGone(current)) {
					var isFirst = !previous;
					var isLast = current === lastBubble;

					if (isFirst && isLast) {
						bubbles = null;
						lastBubble = null;
					} else if (isFirst) {
						bubbles = current.next;
					} else if (isLast) {
						previous.next = current.next;
						lastBubble = previous;
					} else {
						previous.next = current.next;
					}
				}

				previous = current;
				current = current.next;
			}
		}

		function _move(timestamp) {
			var current = bubbles;
			while (current) {
				_moveBubble(current, timestamp);
				current = current.next;
			}
		}

		function _create(timestamp) {
			var newBubblesLength = config.newBubbles();
			for (var i = 0; i < newBubblesLength; i++) {
				var newBubble = _createBubble(timestamp);
				lastBubble.next = newBubble;
				lastBubble = newBubble;
			}
		}

		function _recalculate(timestamp) {
			_cleanup();
			_move(timestamp);
			_create(timestamp);
		}

		function _redraw() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			var current = bubbles;
			while (current) {
				ctx.beginPath();
				ctx.arc(current.x, current.y, current.radius, 0, 2 * Math.PI);
				ctx.lineWidth = current.width;
				ctx.strokeStyle = current.color;
				ctx.globalAlpha = current.alpha;
				ctx.stroke();
				current = current.next;
			}
		}

		function _tick(timestamp) {
			if (!bubbles) {
				bubbles = _createBubble(canvas, timestamp);
				lastBubble = bubbles;
			}
			_recalculate(timestamp);
			_redraw();
			window.requestAnimationFrame(_tick);
		}

		(function(){
			var beer = readQueryString()['beer'];

			if (beer && beer in configs) {
				_changeConfig(configs[beer]);
			}

			_renderMenu();
		})();

		window.requestAnimationFrame(_tick);
		window.addEventListener('popstate', function(event) {
			_changeConfig(configs[history.state || 'lager']);
		});
		window.addEventListener('deviceorientation', function(event) {
			var orientation = window.orientation || 0;
			var positive;
			var mul;

			if (orientation === 90) {
				xMod = event.gamma > 0 ? -(event.beta + 180) : event.beta;
				positive = event.beta < 0;
				mul = 0.1;

			} else if (orientation === -90) {
				xMod = event.gamma > 0 ? event.beta : 180 - Math.abs(event.beta);
				positive = event.beta > 0;
				mul = 0.1;

			} else {
				xMod = Math.abs(event.beta) > 90 ? -event.gamma : event.gamma;
				positive = xMod < 0;
				mul = 0.033;
			}

			xMod = Math.sqrt(Math.abs(xMod) * mul);
			xMod = positive ? xMod : -xMod;
		}, true);
		window.addEventListener('resize', function() {
			canvas.width = document.body.clientWidth;
			canvas.height = document.body.clientHeight;
		});
	}

	if (document.readyState === 'complete') {
		runBubbles();
	} else {
		window.addEventListener('load', runBubbles);
	}
})();

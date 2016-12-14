import SoftPWM from 'raspi-soft-pwm';

// Software state LED configuration
const LED = {
	red: new SoftPWM({
		pin: 6,
		range: 255,
		frequency: 800
	}),
	green: new SoftPWM({
		pin: 10,
		range: 255,
		frequency: 800
	}),
	blue: new SoftPWM({
		pin: 11,
		range: 255,
		frequency: 800
	})
};

function setLED(led, state) {
	switch (state) {
		case 'board-ready':
			// color yellow
			led.red.write(255);
			led.green.write(255);
			led.blue.write(0);
			return;
		case 'connected-to-server':
			// color green
			led.red.write(0);
			led.green.write(255);
			led.blue.write(0);
			return;
		case 'error-connecting-to-server':
			// color red
			led.red.write(255);
			led.green.write(0);
			led.blue.write(0);
			return;
		case 'reconnected-to-server':
			// color white
			led.red.write(255);
			led.green.write(255);
			led.blue.write(255);
			return;
		case 'server-pipe':
			// color blue
			led.red.write(0);
			led.green.write(0);
			led.blue.write(255);
			return;
		case 'board-response':
			// color purple
			led.red.write(255);
			led.green.write(0);
			led.blue.write(255);
			return;
		case 'board-off':
			// led off
			led.red.write(0);
			led.green.write(0);
			led.blue.write(0);
			return;
		default:
			// led off
			led.red.write(0);
			led.green.write(0);
			led.blue.write(0);
	}
}

export default {
	LED,
	setLED
}

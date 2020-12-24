class cobaltEditorKeyboard {

	keyCodes = [];

	constructor() {
		this.keyCodes[3]  = 'Cancel';
		this.keyCodes[6]  = 'Help';
		this.keyCodes[8]  = 'Backspace';
		this.keyCodes[9]  = 'Tab';
		this.keyCodes[12] = 'Numlock-5';
		this.keyCodes[13] = 'Enter';

		this.keyCodes[16] = 'Shift';
		this.keyCodes[17] = 'Control';
		this.keyCodes[18] = 'Alt';
		this.keyCodes[19] = 'Pause';
		this.keyCodes[20] = 'CapsLock';
		this.keyCodes[21] = 'KanaMode'; //HANGUL

		this.keyCodes[23] = 'JunjaMode';
		this.keyCodes[24] = 'FinalMode';
		this.keyCodes[25] = 'HanjaMode'; //KANJI

		this.keyCodes[27] = 'Escape';
		this.keyCodes[28] = 'Convert';
		this.keyCodes[29] = 'NonConvert';
		this.keyCodes[30] = 'Accept';
		this.keyCodes[31] = 'ModeChange';
		this.keyCodes[32] = 'Spacebar';
		this.keyCodes[33] = 'PageUp';
		this.keyCodes[34] = 'PageDown';
		this.keyCodes[35] = 'End';
		this.keyCodes[36] = 'Home';
		this.keyCodes[37] = 'ArrowLeft';
		this.keyCodes[38] = 'ArrowUp';
		this.keyCodes[39] = 'ArrowRight'; // opera has this as a "'" as well...
		this.keyCodes[40] = 'ArrowDown';
		this.keyCodes[41] = 'Select';
		this.keyCodes[42] = 'Print';
		this.keyCodes[43] = 'Execute';
		this.keyCodes[44] = 'PrintScreen'; // opera ';';
		this.keyCodes[45] = 'Insert'; // opera has this as a '-' as well...
		this.keyCodes[46] = 'Delete'; // opera - ',';
		this.keyCodes[47] = '/'; // opera

		this.keyCodes[59] = ';';
		this.keyCodes[60] = '<';
		this.keyCodes[61] = '=';
		this.keyCodes[62] = '>';
		this.keyCodes[63] = '?';
		this.keyCodes[64] = '@';

		this.keyCodes[91] = 'OS'; // opera '[';
		this.keyCodes[92] = 'OS'; // opera '\\';
		this.keyCodes[93] = 'ContextMenu'; // opera ']';
		this.keyCodes[95] = 'Sleep';
		this.keyCodes[96] = '`';

		this.keyCodes[106] = '*'; // keypad
		this.keyCodes[107] = '+'; // keypad
		this.keyCodes[109] = '-'; // keypad
		this.keyCodes[110] = 'Separator';
		this.keyCodes[111] = '/'; // keypad

		this.keyCodes[144] = 'NumLock';
		this.keyCodes[145] = 'ScrollLock';

		this.keyCodes[160] = '^';
		this.keyCodes[161] = '!';
		this.keyCodes[162] = '"';
		this.keyCodes[163] = '#';
		this.keyCodes[164] = '$';
		this.keyCodes[165] = '%';
		this.keyCodes[166] = '&';
		this.keyCodes[167] = '_';
		this.keyCodes[168] = '(';
		this.keyCodes[169] = ')';
		this.keyCodes[170] = '*';
		this.keyCodes[171] = '+';
		this.keyCodes[172] = '|';
		this.keyCodes[173] = '-';
		this.keyCodes[174] = '{';
		this.keyCodes[175] = '}';
		this.keyCodes[176] = '~';

		this.keyCodes[181] = 'VolumeMute';
		this.keyCodes[182] = 'VolumeDown';
		this.keyCodes[183] = 'VolumeUp';

		this.keyCodes[186] = ';';
		this.keyCodes[187] = '=';
		this.keyCodes[188] = ',';
		this.keyCodes[189] = '-';
		this.keyCodes[190] = '.';
		this.keyCodes[191] = '/';
		this.keyCodes[192] = '`';

		this.keyCodes[219] = '[';
		this.keyCodes[220] = '\\';
		this.keyCodes[221] = ']';
		this.keyCodes[222] = "'";
		this.keyCodes[224] = 'Meta';
		this.keyCodes[225] = 'AltGraph';

		this.keyCodes[246] = 'Attn';
		this.keyCodes[247] = 'CrSel';
		this.keyCodes[248] = 'ExSel';
		this.keyCodes[249] = 'EREOF';
		this.keyCodes[250] = 'Play';
		this.keyCodes[251] = 'Zoom';
		this.keyCodes[254] = 'Clear';

		// a-z
		for ( var i=65; i<=90; i++ ) {
			this.keyCodes[i] = String.fromCharCode( i ).toLowerCase();
		}

		// 0-9
		for ( var i=48; i<=57; i++ ) {
			this.keyCodes[i] = String.fromCharCode( i );
		}
		// 0-9 keypad
		for ( var i=96; i<=105; i++ ) {
			this.keyCodes[i] = ''+(i-95);
		}

		// F1 - F24
		for ( var i=112; i<=135; i++ ) {
			this.keyCodes[i] = 'F'+(i-111);
		}
	}

	getKey( evt ) {
		var keyInfo = '';
		if ( evt.ctrlKey && evt.keyCode != 17 ) {
			keyInfo += 'Control+';
		}
		if ( evt.metaKey && evt.keyCode != 224 ) {
			keyInfo += 'Meta+';
		}
		if ( evt.altKey && evt.keyCode != 18 ) {
			keyInfo += 'Alt+';
		}
		if ( evt.shiftKey && evt.keyCode != 16 ) {
			keyInfo += 'Shift+';
		}
		// evt.key turns shift+a into A, while keeping shiftKey, so it becomes Shift+A, instead of Shift+a.
		// so while it may be the future, i'm not using it here.
		if ( evt.charCode ) {
			keyInfo += String.fromCharCode( evt.charCode ).toLowerCase();
		} else if ( evt.keyCode ) {
			if ( typeof this.keyCodes[evt.keyCode] == 'undefined' ) {
				keyInfo += '('+evt.keyCode+')';
			} else {
				keyInfo += this.keyCodes[evt.keyCode];
			}
		} else {
			keyInfo += 'Unknown';
		}
		return keyInfo;
	}

	listen( el, key, callback, capture ) {
		return el.addEventListener('keydown', function(evt) {
			var  pressedKey = self.getKey( evt );
			if ( key == pressedKey ) {
				callback.call( el, evt );
			}
		}, capture);
	}

	getCharacter(evt) {
		evt = evt || window.event;
		if ( evt.which!==0 && !evt.ctrlKey && !evt.metaKey && !evt.altKey ) {
    		return String.fromCharCode(evt.which);
    	}
	}

}

export default new cobaltEditorKeyboard();
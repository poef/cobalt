	// minimal mime encoding/decoding, stolen from https://github.com/andris9/mimelib/blob/master/lib/mimelib.js

let mime = {};

mime.getHeaders = function( message ) {
	var parseHeader = function( line ) {
	    if (!line) {
	        return {};
	    }

	    var result = {}, parts = line.split(";"),
	        pos;

	    for (var i = 0, len = parts.length; i < len; i++) {
	        pos = parts[i].indexOf("=");
	        if (pos < 0) {
	        	pos = parts[i].indexOf(':');
	        }
	        if ( pos < 0 ) {
	            result[!i ? "defaultValue" : "i-" + i] = parts[i].trim();
	        } else {
	            result[parts[i].substr(0, pos).trim().toLowerCase()] = parts[i].substr(pos + 1).trim();
	        }
	    }
	    return result;
	};
	var line = null;
	var headers = {};
	var temp = {};
	while ( line = message.match(/^.*$/m)[0] ) {
		message = message.substring( line.length );
		temp = parseHeader( line );
		for ( var i in temp ) {
			headers[i] = temp[i];
		}
		var returns = message.match(/^\r?\n|\r/);
		if ( returns && typeof returns[0] != 'undefined') {
			message = message.substring( returns[0].length );
		}
	}
	return {
		headers: headers,
		message: message.substring(1)
	}
}

mime.encode = function( parts, message, headers ) {
	var boundary = 'cobaltBoundary'+Date.now();
	var result = 'MIME-Version: 1.0\n';
	if ( headers ) {
		result += headers.join("\n");
	}
	result += 'Content-Type: multipart/related; boundary='+boundary+'\n\n';
	if ( message ) {
		result += message;
	}
	for ( var i=0, l=parts.length; i<l; i++ ) {
		result += '\n--'+boundary+'\n' + parts[i];
	}
	return result;
}

mime.decode = function( message ) {
	if (!message) {
		return {
			headers: [],
			message: '',
			parts: []
		};
	}
	var part;
	var parsed = mime.getHeaders( message );
	parsed.parts = [];
	if ( parsed.headers.boundary ) {
		var parts = parsed.message.split( '\n--'+parsed.headers.boundary+"\n" );
		var message = parts.shift();
		if ( message ) {
			parsed.message = message;
		}
		while ( part = parts.shift() ) {
			parsed.parts.push( mime.decode(part) );
		}
	}
	return parsed;
}

export default mime;


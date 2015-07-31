cobalt = (function(self) {

	var cobaltError = function(message, code) {
		this.message = message;
		this.code = code;
		this.name = 'cobalt.Error';
	}

	self.error = function(message, code) {
		throw new cobaltError(message, code);
	}
	
	return self;
})(this.cobalt || {});
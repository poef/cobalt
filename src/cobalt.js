cobalt = (function(self) {

	var cobaltError = function(message, code) {
		this.message = message;
		this.code = code;
		this.name = 'cobalt.Error';
	}

	self.error = function(message, code) {
		throw new cobaltError(message, code);
	}
	
	self.implements = function(o, type) {
		// since most cobalt types are defined in a super-private scope
		// instanceof doesn't work to type check. This is a workaround.
		return (typeof o != 'undefined' && typeof o.type!='undefined' && o.type === type );
	}

	return self;
})(this.cobalt || {});
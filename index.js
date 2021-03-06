'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // external libraries


var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _isoPathJoin = require('iso-path-join');

var _isoPathJoin2 = _interopRequireDefault(_isoPathJoin);

var _querystring = require('querystring');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// server-side/polyfills
var FormData = global.FormData || require('form-data');
var fetch = global.fetch || require('isomorphic-fetch');

// boolean true if on server false if on client
var isServer = !(typeof window !== 'undefined' && window.document);

// needed as absolute routes are needed server-side until Node.js implements native fetch
var baseURL = !isServer ? '' : process.env.BASE_URL || 'http://localhost:' + (process.env.PORT || 3000);

var unListenFactory = function unListenFactory(arr, func, index) {
	return function () {
		if (arr[index] === func) {
			arr.splice(index, 1);
			return true;
		}

		// look through whole array for function, keep track of whether or not it is found
		var found = false;
		arr.filter(function (val, i) {
			if (val === func) {
				found = true;
				return false; // remove from bound functions
			}
			return true;
		});

		if (!found && process.NODE_ENV !== 'production') {
			console.warn('tried to unbind function that was not listening');
		}

		// return whether or not function that they tried to unbind was found
		return found;
	};
};

function listenFactory(arrName) {
	return function listenFunction(func) {
		var index = this.bindingsContainer[arrName].push(func); // returns index which can be used to "unbind"
		return unListenFactory(this.bindingsContainer[arrName], func, index);
	};
}

// request methods which shortcuts will be made for
var methods = ['get', 'put', 'post', 'del', 'patch'];

var SimpleIsoFetch = function () {
	_createClass(SimpleIsoFetch, null, [{
		key: 'setBaseUrl',
		value: function setBaseUrl(hostUrl, port) {
			// allows for setting base url server-side without environmental variable
			baseURL = hostUrl && '' + hostUrl + (port && ':' + port || '') || 'http://localhost:' + (port || process.env.PORT || 3000);
			return baseURL;
		}
	}, {
		key: 'getBaseUrl',
		value: function getBaseUrl() {
			return baseURL;
		}
	}, {
		key: 'simpleIsoFetchThunk',
		value: function simpleIsoFetchThunk(simpleIsoFetchInstance) {
			return function (store) {
				return function (next) {
					return function (action) {
						return (// eslint-disable-line no-unused-vars
							next(typeof action === 'function' ? action(simpleIsoFetchInstance) : action)
						);
					};
				};
			};
		}
	}, {
		key: 'syncBindingsWithStore',
		value: function syncBindingsWithStore(simpleIsoFetchInstance, store) {
			var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
			    _ref$stateProperty = _ref.stateProperty,
			    stateProperty = _ref$stateProperty === undefined ? 'simpleIsoFetch' : _ref$stateProperty;

			// Ensure that the reducer is mounted on the store and functioning properly.
			if (!store.getState()[stateProperty]) {
				throw new Error('Expected the simple-iso-fetch state to be available either as `state.simpleIsoFetch` ' + 'or as the custom expression you can specify as `stateProperty` ' + 'in the `syncBindingsWithStore()` options. ' + 'Ensure you have added the `bindingsReducer` to your store\'s ' + 'reducers via `combineReducers` or whatever method you use to isolate ' + 'your reducers.');
			}

			store.dispatch({
				type: '@@simpleIsoFetch/INIT_BINDINGS',
				bindings: simpleIsoFetchInstance.bindingsContainer
			});
		}
	}, {
		key: 'bindingsReducer',
		value: function bindingsReducer() {
			var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
			var action = arguments[1];

			if (!Object.keys(state).length && ~action.type.indexOf('simpleIsoFetch') && !~action.type.indexOf('INIT_BINDINGS')) {
				throw new Error('You need to run syncBindingsWithStore(<simpleIsoFetch instance>,<store>) ' + 'in order to initialize bindings ');
			}

			switch (action.type) {
				case '@@simpleIsoFetch/INIT_BINDINGS':
					return action.bindings;

				case '@@simpleIsoFetch/BIND_FUNC':
					state[action.bindArr] = state[action.bindArr].concat(action.bindFunc);
					return state;

				case '@@simpleIsoFetch/UNBIND_FUNC':
					state[action.bindArr] = state[action.bindArr].filter(function (func) {
						return (
							// check object equivalence
							func !== action.unbindFunc && (
							// check stringified function equivalence
							func.toString() !== action.unbindFunc.toString() || ~func.toString().indexOf('native code')) &&
							// check function name equivalence
							func.name.replace('bound ', '') !== action.unbindFunc.name
						);
					});
					return state;

				default:
					return state;
			}
		}
	}, {
		key: 'bindToErrorAction',
		value: function bindToErrorAction(func) {
			return {
				type: '@@simpleIsoFetch/BIND_FUNC',
				bindArr: 'boundToError',
				bindFunc: func
			};
		}
	}, {
		key: 'bindToSuccessAction',
		value: function bindToSuccessAction(func) {
			return {
				type: '@@simpleIsoFetch/BIND_FUNC',
				bindArr: 'boundToSuccess',
				bindFunc: func
			};
		}
	}, {
		key: 'bindToResponseAction',
		value: function bindToResponseAction(func) {
			return {
				type: '@@simpleIsoFetch/BIND_FUNC',
				bindArr: 'boundToResponse',
				bindFunc: func
			};
		}
	}, {
		key: 'unbindFromErrorAction',
		value: function unbindFromErrorAction(func) {
			return {
				type: '@@simpleIsoFetch/UNBIND_FUNC',
				bindArr: 'boundToError',
				unbindFunc: func
			};
		}
	}, {
		key: 'unbindFromSuccessAction',
		value: function unbindFromSuccessAction(func) {
			return {
				type: '@@simpleIsoFetch/UNBIND_FUNC',
				bindArr: 'boundToSuccess',
				unbindFunc: func
			};
		}
	}, {
		key: 'unbindFromResponseAction',
		value: function unbindFromResponseAction(func) {
			return {
				type: '@@simpleIsoFetch/UNBIND_FUNC',
				bindArr: 'boundToResponse',
				unbindFunc: func
			};
		}
	}, {
		key: 'makeRequest',
		value: function makeRequest(o) {
			var reqObjAsSecondArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

			return _makeRequest.bind(this)(o, reqObjAsSecondArg);
		}
	}]);

	function SimpleIsoFetch(req) {
		var _this = this;

		_classCallCheck(this, SimpleIsoFetch);

		this.bindingsContainer = {
			boundToError: [], // array of functions to be called upon error
			boundToSuccess: [], // array of functions to be called upon success responses
			boundToResponse: [] // array of functions to be called upon all responses
		};
		this.bindToError = listenFactory('boundToError');
		this.bindToSuccess = listenFactory('boundToSuccess');
		this.bindToResponse = listenFactory('boundToResponse');

		this.cookiesObj = req && req.get && req.get('cookie') && { cookie: req.get('cookie') };
		this.makeRequest = this.makeRequest.bind(this);

		// add methods for request methods
		methods.forEach(function (method) {
			return (// eslint-disable-line no-return-assign
				_this[method] = function (o) {
					var reqObjAsSecondArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
					return _this.makeRequest(o, _extends({}, reqObjAsSecondArg, { method: method === 'del' ? 'delete' : method }));
				}
			);
		}); // if string is passed just use that as route
	}

	// bound functions arrays


	// binding functions, for if you are not using redux
	// generates function for pushing to 'boundToError'
	// generates function for pushing to 'boundToSuccess'


	_createClass(SimpleIsoFetch, [{
		key: 'makeRequest',
		// generates function for pushing to 'boundToResponse'

		value: function makeRequest(o) {
			var _this2 = this;

			var reqObjAsSecondArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

			return _makeRequest.call(this, o, reqObjAsSecondArg).then(function (res) {
				return !res.ok ? (_this2.bindingsContainer.boundToResponse.concat(_this2.bindingsContainer.boundToError).forEach(function (boundFunc) {
					return boundFunc(res);
				}), // run bound functions
				Promise.reject(_lodash2.default.merge(res, { statusText: (o.method || '').toUpperCase() + ' \n ' + o.route + ' \n ' + res.status + ' (' + res.statusText + ')' })) // resolve error
				) : (_this2.bindingsContainer.boundToResponse.concat(_this2.bindingsContainer.boundToSuccess).forEach(function (boundFunc) {
					return boundFunc(res);
				}), // run bound functions
				Promise.resolve(res));
			}).catch(function (res) {
				// run error res through bound functions
				_this2.bindingsContainer.boundToResponse.concat(_this2.bindingsContainer.boundToError).forEach(function (boundFunc) {
					return boundFunc(res);
				});

				// send error to the '.catch' wherev the api library is being used
				return Promise.reject(res);
			});
		}
	}]);

	return SimpleIsoFetch;
}();

;

// add methods for request methods as statics too!
methods.forEach(function (method) {
	return (// eslint-disable-line no-return-assign
		SimpleIsoFetch[method] = function (o) {
			var reqObjAsSecondArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
			return SimpleIsoFetch.makeRequest(o, _extends({}, reqObjAsSecondArg, { method: method === 'del' ? 'delete' : method }));
		}
	);
}); // if string is passed just use that as route


function _makeRequest(o) {
	var reqObjAsSecondArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	// allow for first argument to be a route string and for options to be passed in as object in second argument
	o = _extends({}, reqObjAsSecondArg, typeof o === 'string' ? { route: o } : o);

	// error if no route is provided
	if (!o.route) return console.error("no 'route' property specified on request");

	// make relative routes absolute, isomorphism needs this until Node.js implements native fetch
	if (o.route[0] === '/') o.route = '' + baseURL + o.route;

	// provide default values
	o.params = o.params || [];
	if (~['get', 'del'].indexOf(o.method) && o.body) {
		console.error('request body can not be sent on get or delete requests, body has been set to null');
		o = _extends({}, o, { body: null });
	}

	o.headers = _lodash2.default.merge({
		Accept: '*/*',
		'Accept-Encoding': 'gzip, deflate, sdch, br',
		'Content-Type': !o.body || typeof o.body === 'string' ? // intelligently determine content type
		'text/plain' : o.body instanceof (isServer ? Buffer : Blob) ? o.body.type : o.body instanceof FormData ? 'multipart/form-data' : 'application/json'
	}, this && this.cookiesObj || {}, o.headers || {});

	// convert Node.js Buffers to ArrayBuffers which can be sent in requests
	if (isServer && o.body instanceof Buffer) {
		o.body = o.body.buffer.slice(o.body.byteOffset, o.body.byteOffset + o.body.byteLength);
	}

	// transform query object into query string format
	o.query = !o.query ? '' : '?' + (0, _querystring.stringify)(o.query);

	var methodResMessage = (o.method || '').toUpperCase();
	var fullUrl = (0, _isoPathJoin2.default)(o.route, o.params, o.query);
	var res = { method: methodResMessage }; // explicity add method to response, otherwise it's not included
	var requestConfig = {
		credentials: o.credentials || 'same-origin',
		redirect: o.redirect || 'follow',
		method: o.method,
		headers: new Headers(o.headers), // 'Headers' is a new native global paired with 'fetch'

		// enables cors requests for absolute paths not beginning with current site's href
		// note that cookies can't be set with the response on cors requests
		mode: o.mode || (o.route.slice[0] === '/' || baseURL && o.route.indexOf(baseURL) === 0 ? 'same-origin' : 'cors')
	};

	// add given body property to requestConfig if not a GET or DELETE request
	if (o.body) {
		requestConfig.body = o.headers['Content-Type'] === 'application/json' && typeof o.body !== 'string' ? JSON.stringify(o.body) : // fetch expects stringified body jsons, not objects
		o.body;
	}

	// actual api call occurs here
	return fetch(fullUrl, requestConfig).then(function (unparsedRes) {
		var responseBodyContentType = unparsedRes.headers.get('Content-Type');

		// first add props other than body to response, then determine how to parse response
		return _lodash2.default.merge(res, _lodash2.default.omit(unparsedRes, 'body')), !responseBodyContentType || ~responseBodyContentType.indexOf('text') ? unparsedRes.text() : ~responseBodyContentType.indexOf('json') ? unparsedRes.json() : ~responseBodyContentType.indexOf('form') ? unparsedRes.formData() : o.responseType === 'arrayBuffer' ? // allow user to specify arraybuffer vs blob, don't think you can actually determine difference as it seems like different ways to view same data
		unparsedRes.arrayBuffer : unparsedRes.blob();
	}).then(function (body) {
		return (
			// update body with parsed body
			Promise.resolve(_lodash2.default.merge(res, { body: body }))
		);
	}).catch(function (err) {
		// default to fake normal response on request error so that response handlers can deal with it
		if (!Object.keys(res).length) {
			_lodash2.default.merge({
				url: o.route,
				status: 501,
				statusText: methodWithDefault + ' \n ' + o.route + ' \n ' + res.status + ' (' + err.message + ')'
			}, res);
		}

		return Promise.reject(res);
	});
}

// export SimpleIsoFetch class
module.exports = SimpleIsoFetch;

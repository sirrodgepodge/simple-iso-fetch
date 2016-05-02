'use strict';

var fetch = require('isomorphic-fetch');
var _ = require('lodash');
var pathJoin = require('iso-path-join');

function onServer() {
	return !(typeof window !== 'undefined' && window.document);
}

// boolean true if on server false if on client
var isServer = onServer();

// needed as absolute routes are needed server-side until Node.js implements native fetch
var baseURL = !isServer ? '' : process.env.BASE_URL || 'http://localhost:' + (process.env.PORT || 3000);

var unListenFactory = function unListenFactory(arr, func, index) {
	return function () {
		if (arr[index] === func) {
			arr.splice(index, 1);
			return true;
		}
		if (process.NODE_ENV !== 'production') {
			console.warn('tried to unbind function that was not listening');
		}
		return false;
	};
};

function listenFactory(arrName) {
	return function listenFunction(func) {
		var index = this[arrName].push(func); // returns index which can be used to "unbind"
		return unListenFactory(this[arrName], func, index);
	};
}

module.exports = {
	setHostUrl: function setHostUrl(hostUrl) {
		// allows for setting base url server-side without environmental variable
		baseURL = !isServer ? '' : hostUrl || 'http://localhost:' + (process.env.PORT || 3000);
	},
	makeRequest: function makeRequest(o) {
		var _this = this;

		// error if no route is provided
		if (!o.route) return console.error("no 'route' property specified on request");

		// make relative routes absolute, isomorphism needs this until Node.js implements native fetch
		if (o.route.slice(0, 1) === '/') o.route = '' + baseURL + o.route;

		// provide default values
		o.params = o.params || [];
		o.headers = _.merge({
			Accept: '*/*',
			'Accept-Encoding': 'gzip, deflate, sdch',
			'Content-Type': !o.body || typeof o.body === 'string' ? 'text/plain' : o.body instanceof Blob ? o.body.type : o.body instanceof FormData ? 'multipart/form-data' : 'application/json'
		}, o.headers || {});

		// transform query object into query string format, JSON-ifying contained objects
		o.query = !o.query ? '' : '?' + Object.keys(o.query).map(function (val) {
			return val + '=' + (o.query[val] && typeof o.query[val] === 'object' ? JSON.stringify(o.query[val]) : o.query[val]);
		}).join('&');

		var fullUrl = '' + o.route + pathJoin(o.params, '/') + o.query;
		var res = { method: o.method.toUpperCase() }; // explicity add method to response, otherwise it's not included
		var requestConfig = {
			credentials: !o.includeCreds ? 'include' : 'same-origin',
			method: o.method,
			headers: new Headers(o.headers), // 'Headers' is a new native global paired with 'fetch'

			// enables cors requests for absolute paths not beginning with current site's href
			// note that cookies can't be set with the response on cors requests
			mode: o.route.slice(0, 1) === '/' || baseURL && o.route.indexOf(baseURL) === 0 ? 'same-origin' : 'cors'
		};

		// add given body property to requestConfig if not a GET or DELETE request
		if (o.body) {
			if (~['get', 'delete'].indexOf(o.method)) {
				console.error('request body can not be sent on get or delete requests');
			} else {
				requestConfig.body = o.headers['Content-Type'] === 'application/json' && typeof o.body !== 'string' ? JSON.stringify(o.body) : // fetch expects stringified body jsons, not objects
				o.body;
			}
		}

		return fetch(fullUrl, requestConfig).then(function (unparsedRes) {
			var responseBodyContentType = unparsedRes.headers.get('Content-Type');

			// first add props other than body to response, then determine how to parse response
			return _.merge(res, _.omit(unparsedRes, 'body')), !responseBodyContentType || ~responseBodyContentType.indexOf('text') ? unparsedRes.text() : ~responseBodyContentType.indexOf('json') ? unparsedRes.json() : ~responseBodyContentType.indexOf('form') ? unparsedRes.formData() : o.responseType === 'arrayBuffer' ? // allow user to specify arraybuffer vs blob, don't think you can actually determine difference as it seems like different ways to view same data
			unparsedRes.arrayBuffer : unparsedRes.blob();
		}).then(function (body) {
			return(
				// update body with parsed body
				_.merge(res, { body: body }) && !res.ok ? (console.log('error response', res, 'responseHandlers', _this.boundToResponse.concat(_this.boundToError)), _this.boundToResponse.concat(_this.boundToError).forEach(function (boundFunc) {
					return boundFunc(res);
				}), // run bound functions
				Promise.reject(new Error(o.method + ' \n ' + fullUrl + ' \n ' + res.status + ' (' + res.statusText + ')')) // resolve error
				) : (_this.boundToResponse.concat(_this.boundToSuccess).forEach(function (boundFunc) {
					return boundFunc(res);
				}), // run bound functions
				Promise.resolve(res))
			);
		}).catch(function (err) {
			// fake normal response so that response handlers can deal with it
			if (!Object.keys(res).length) {
				_.merge(res, {
					url: o.route,
					status: 404,
					statusText: err.message + '\n\t\t\t\t\t\t\t\t\t\t\t\t ' + o.method.toUpperCase() + ',' + o.route
				});
				_this.boundToResponse.concat(_this.boundToError).forEach(function (boundFunc) {
					return boundFunc(res);
				});
			}

			// send error to the '.catch' where the api library is being used
			return Promise.reject(err);
		});
	},
	get: function get(o) {
		if (typeof o === 'string') o = { route: o }; // if string is passed just use that as route
		o.method = 'get';
		return this.makeRequest(o);
	},
	del: function del(o) {
		if (typeof o === 'string') o = { route: o }; // if string is passed just use that as route
		o.method = 'delete';
		return this.makeRequest(o);
	},
	post: function post(o) {
		if (typeof o === 'string') o = { route: o }; // if string is passed just use that as route
		o.method = 'post';
		return this.makeRequest(o);
	},
	put: function put(o) {
		if (typeof o === 'string') o = { route: o }; // if string is passed just use that as route
		o.method = 'put';
		return this.makeRequest(o);
	},

	boundToError: [], // arrays of functions to be called upon error
	boundToSuccess: [], // arrays of functions to be called upon success responses
	boundToResponse: [], // will be arrays of functions to be called upon all responses
	bindToError: listenFactory('boundToError'), // generates function for pushing to 'boundToError'
	bindToSuccess: listenFactory('boundToSuccess'), // generates function for pushing to 'boundToSuccess'
	bindToResponse: listenFactory('boundToResponse') // generates function for pushing to 'boundToResponse'
};

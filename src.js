// external libraries
import _ from 'lodash';
import pathJoin from 'iso-path-join';
import {stringify as queryStringify} from 'querystring';

// server-side/polyfills
const FormData = global.FormData || require('form-data');
const fetch = global.fetch || require('isomorphic-fetch');

// boolean true if on server false if on client
const isServer = !(typeof window !== 'undefined' && window.document);

// needed as absolute routes are needed server-side until Node.js implements native fetch
let baseURL = !isServer ? '' : process.env.BASE_URL || (`http://localhost:${process.env.PORT || 3000}`);

const unListenFactory = (arr, func, index) => () => {
	if (arr[index] === func) {
		arr.splice(index, 1);
		return true;
	}

  // look through whole array for function, keep track of whether or not it is found
  let found = false;
  arr.filter((val, i) => {
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

function listenFactory(arrName) {
	return function listenFunction(func) {
		const index = this.bindingsContainer[arrName].push(func); // returns index which can be used to "unbind"
		return unListenFactory(this.bindingsContainer[arrName], func, index);
	};
}

// request methods which shortcuts will be made for
const methods = ['get', 'put', 'post', 'del', 'patch'];


class SimpleIsoFetch {
  static setBaseUrl(hostUrl, port) { // allows for setting base url server-side without environmental variable
    baseURL = hostUrl && `${hostUrl}${port && `:${port}` || ''}` || (`http://localhost:${port || process.env.PORT || 3000}`);
    return baseURL;
  }

	static getBaseUrl() {
		return baseURL;
	}

	static simpleIsoFetchThunk(simpleIsoFetchInstance) {
		return store => next => action => // eslint-disable-line no-unused-vars
			next(typeof action === 'function' ? action(simpleIsoFetchInstance) : action);
	}

	static syncBindingsWithStore(simpleIsoFetchInstance, store, {
		stateProperty = 'simpleIsoFetch'
	} = {}) {
		// Ensure that the reducer is mounted on the store and functioning properly.
		if (!store.getState()[stateProperty]) {
			throw new Error(
				'Expected the simple-iso-fetch state to be available either as `state.simpleIsoFetch` ' +
				'or as the custom expression you can specify as `stateProperty` ' +
				'in the `syncBindingsWithStore()` options. ' +
				'Ensure you have added the `bindingsReducer` to your store\'s ' +
				'reducers via `combineReducers` or whatever method you use to isolate ' +
				'your reducers.'
			);
		}

		store.dispatch({
			type: '@@simpleIsoFetch/INIT_BINDINGS',
			bindings: simpleIsoFetchInstance.bindingsContainer
		});
	}

	static bindingsReducer(state = {}, action) {
		if(!Object.keys(state).length && ~action.type.indexOf('simpleIsoFetch') && !~action.type.indexOf('INIT_BINDINGS')) {
			throw new Error(
				'You need to run syncBindingsWithStore(<simpleIsoFetch instance>,<store>) ' +
				'in order to initialize bindings '
			);
		}

		switch (action.type) {
			case '@@simpleIsoFetch/INIT_BINDINGS':
				return action.bindings;

			case '@@simpleIsoFetch/BIND_FUNC':
				state[action.bindArr] = state[action.bindArr].concat(action.bindFunc);
				return state;

			case '@@simpleIsoFetch/UNBIND_FUNC':
				state[action.bindArr] = state[action.bindArr].filter(func =>
					// check object equivalence
					func !== action.unbindFunc &&
					// check stringified function equivalence
					(func.toString() !== action.unbindFunc.toString() || ~func.toString().indexOf('native code')) &&
					// check function name equivalence
					func.name.replace('bound ', '') !== action.unbindFunc.name);
				return state;

			default:
				return state;
		}
	}

	static bindToErrorAction(func) {
		return {
			type: '@@simpleIsoFetch/BIND_FUNC',
			bindArr: 'boundToError',
			bindFunc: func
		};
	}

	static bindToSuccessAction(func) {
		return {
			type: '@@simpleIsoFetch/BIND_FUNC',
			bindArr: 'boundToSuccess',
			bindFunc: func
		};
	}

	static bindToResponseAction(func) {
		return {
			type: '@@simpleIsoFetch/BIND_FUNC',
			bindArr: 'boundToResponse',
			bindFunc: func
		};
	}

	static unbindFromErrorAction(func) {
		return {
			type: '@@simpleIsoFetch/UNBIND_FUNC',
			bindArr: 'boundToError',
			unbindFunc: func
		};
	}

	static unbindFromSuccessAction(func) {
		return {
			type: '@@simpleIsoFetch/UNBIND_FUNC',
			bindArr: 'boundToSuccess',
			unbindFunc: func
		};
	}

	static unbindFromResponseAction(func) {
		return {
			type: '@@simpleIsoFetch/UNBIND_FUNC',
			bindArr: 'boundToResponse',
			unbindFunc: func
		};
	}

	static makeRequest(o, reqObjAsSecondArg = {}) {
		return makeRequest.bind(this)(o, reqObjAsSecondArg);
	}

  constructor(req) {
    this.cookiesObj = req && req.get && req.get('cookie') && {cookie: req.get('cookie')};
    this.makeRequest = ::this.makeRequest;

    // add methods for request methods
    methods.forEach(method => // eslint-disable-line no-return-assign
      this[method] = (o, reqObjAsSecondArg = {}) =>
        this.makeRequest(o, {...reqObjAsSecondArg, method: method === 'del' ? 'delete' : method})); // if string is passed just use that as route
	}

  // bound functions arrays
  bindingsContainer = {
		boundToError: [], // array of functions to be called upon error
		boundToSuccess: [], // array of functions to be called upon success responses
		boundToResponse: [] // array of functions to be called upon all responses
	}

  // binding functions, for if you are not using redux
  bindToError = listenFactory('boundToError') // generates function for pushing to 'boundToError'
  bindToSuccess = listenFactory('boundToSuccess') // generates function for pushing to 'boundToSuccess'
  bindToResponse = listenFactory('boundToResponse') // generates function for pushing to 'boundToResponse'

	makeRequest(o, reqObjAsSecondArg = {}) {
		return makeRequest.bind(this)(o, reqObjAsSecondArg)
			.then(res =>
				!res.ok ?
					(
						this.bindingsContainer.boundToResponse.concat(this.bindingsContainer.boundToError).forEach(boundFunc => boundFunc(res)), // run bound functions
						Promise.reject(_.merge(res, {statusText: `${o.method.toUpperCase()} \n ${fullUrl} \n ${res.status} (${res.statusText})`})) // resolve error
					) :
					(
						this.bindingsContainer.boundToResponse.concat(this.bindingsContainer.boundToSuccess).forEach(boundFunc => boundFunc(res)), // run bound functions
						Promise.resolve(res)
					)
			)
			.catch(res => {
				// run error res through bound functions
				this.bindingsContainer.boundToResponse.concat(this.bindingsContainer.boundToError).forEach(boundFunc => boundFunc(res));

				// send error to the '.catch' wherev the api library is being used
				return Promise.reject(res);
			});
	}
};


// add methods for request methods as statics too!
methods.forEach(method => // eslint-disable-line no-return-assign
	SimpleIsoFetch[method] = (o, reqObjAsSecondArg = {}) =>
		SimpleIsoFetch.makeRequest(o, {...reqObjAsSecondArg, method: method === 'del' ? 'delete' : method})); // if string is passed just use that as route


function makeRequest(o, reqObjAsSecondArg = {}) {
	// allow for first argument to be a route string and for options to be passed in as object in second argument
	o = {...reqObjAsSecondArg, ...(typeof o === 'string' ? {route: o} : o)};

	// error if no route is provided
	if (!o.route) return console.error("no 'route' property specified on request");

	// make relative routes absolute, isomorphism needs this until Node.js implements native fetch
	if (o.route[0] === '/') o.route = `${baseURL}${o.route}`;

	// provide default values
  o.params = o.params || [];
	if (~['get', 'del'].indexOf(o.method) && o.body) {
		console.error('request body can not be sent on get or delete requests, body has been set to null');
		o = {...o, body: null};
	}

	o.headers = _.merge({
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, sdch, br',
    'Content-Type': !o.body || typeof o.body === 'string' ? // intelligently determine content type
    'text/plain' :
      o.body instanceof (isServer ? Buffer : Blob) ?
      o.body.type :
      o.body instanceof FormData ?
      'multipart/form-data' :
      'application/json',
    },
    this && this.cookiesObj || {},
    o.headers || {});

  // convert Node.js Buffers to ArrayBuffers which can be sent in requests
  if (isServer && o.body instanceof Buffer) {
    o.body = o.body.buffer.slice(o.body.byteOffset, o.body.byteOffset + o.body.byteLength);
  }

	// transform query object into query string format
	o.query = !o.query ? '' :
		`?${queryStringify(o.query)}`;

	const fullUrl = `${o.route}${pathJoin(o.params, '/')}${o.query}`;
	const res = {method: o.method.toUpperCase()}; // explicity add method to response, otherwise it's not included
	const requestConfig = {
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
		requestConfig.body = o.headers['Content-Type'] === 'application/json' && typeof o.body !== 'string' ?
			JSON.stringify(o.body) : // fetch expects stringified body jsons, not objects
			o.body;
	}

	// actual api call occurs here
	return fetch(fullUrl, requestConfig)
    .then(unparsedRes => {
			const responseBodyContentType = unparsedRes.headers.get('Content-Type');

			// first add props other than body to response, then determine how to parse response
			return _.merge(res, _.omit(unparsedRes, 'body')),
				!responseBodyContentType || ~responseBodyContentType.indexOf('text') ?
				unparsedRes.text() :
				~responseBodyContentType.indexOf('json') ?
				unparsedRes.json() :
				~responseBodyContentType.indexOf('form') ?
				unparsedRes.formData() :
				o.responseType === 'arrayBuffer' ? // allow user to specify arraybuffer vs blob, don't think you can actually determine difference as it seems like different ways to view same data
				unparsedRes.arrayBuffer :
				unparsedRes.blob();
		})
		.then(body =>
			// update body with parsed body
			Promise.resolve(_.merge(res, {body}))
		)
		.catch(err => {
			// default to fake normal response on request error so that response handlers can deal with it
			if (!Object.keys(res).length) {
				_.merge({
					url: o.route,
					status: 501,
					statusText: `${o.method.toUpperCase()} \n ${fullUrl} \n ${res.status} (${err.message})`
				}, res);
			}

			return Promise.reject(res);
		})
}

// export SimpleIsoFetch class
module.exports = SimpleIsoFetch;

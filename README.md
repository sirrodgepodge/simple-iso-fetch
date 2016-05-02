# simple-iso-fetch
The new Fetch API is way better than XHR to work with for sure, but theres still a decent way to go to make it dead simple, I've attempted to bridge that gap with this library :).

I have also added the ability to bind functions to be run when API responses are received.  Functions can be bound to error responses, to success responses, and to all responses (both success and error).  See methods for this below 'Making Requests' section.

[![NPM][nodei-image]][nodei-url]

## Making Requests
```js
import simpleFetch from 'simple-iso-fetch';

// absolute routes are needed server-side until Node.js implements native fetch,
// you can set the base URL for server-side via the method below or with 'process.env.BASE_URL'
simpleFetch.setHost('http://google.com');

// example usage for get request to 'http://google.com'
simpleFetch.get({
  route: '/'
})
.then(res => {
  console.log(res); // => all html returned from http://google.com 
});

// identical to the above, convenience default for when string is passed to method function
simpleFetch.get('/').then(res => {
  console.log(res); // => all html returned from http://google.com 
});

// set to your app's hostname
simpleFetch.setHost('http://localhost:3000');


// normal usage
const aJsonObject = {
  prop: 'example'
}

const exampleParam = 'paramparamparam';

// the below will make a POST request to:
// 'http://localhost:3000/api/paramparamparam?prop=valvalval&prop2=anotherVal'
simpleFetch.post({
  route: '/api',
  params: exampleParam,
  query: {
    prop: 'valvalval',
    prop2: 'anotherVal'
  },
  body: aJsonObject
})
.then(res => console.log(res)) // console.logs whatever the response is
.catch(err => console.log(err)); // console.logs whatever the error is

// the below will make a PUT request to:
// 'http://localhost:3000/api/paramparamparam?prop=valvalval&prop2=anotherVal'
simpleFetch.put({
  route: '/api',
  params: exampleParam,
  query: {
    prop: 'valvalval',
    prop2: 'anotherVal'
  },
  body: aJsonObject
})
.then(res => console.log(res)) // console.logs whatever the response is
.catch(err => console.log(err)); // console.logs whatever the error is

// the below will make a DELETE request to:
// 'http://localhost:3000/api/paramparamparam?prop=valvalval&prop2=anotherVal'
// (note that DELETE and GET requests can't have a 'body' property per W3C spec)
simpleFetch.del({
  route: '/api',
  params: exampleParam,
  query: {
    prop: 'valvalval',
    prop2: 'anotherVal'
  }
})
.then(res => console.log(res)) // console.logs whatever the response is
.catch(err => console.log(err)); // console.logs whatever the error is


// full configurable options exposed below
//// dummy body
const blogPost = {
  title: 'Hey Guys',
  body: 'I\'m o simple!'
}

//// dummy params
const id = '1234';
const location = 'place';

// the below will make a POST request to:
// 'http://localhost:3000/api/posts/1234/place/?anAnalyticsThing={"aDeeplyNestedProperty":"example"}&anotherProperty=example2'
simpleFetch.makeRequest({
  // instead of 'makeRequest method + 'method' property you just use simpleFetch.<lowercase method> instead of 
  // simpleFetch.makeRequest for GET, PUT, and POST, DELETE uses the simpleFetch 'del' method as 'delete'
  // is a reserved word.  The makeRequest method allows you to specify the method and therefore allows
  // for less common methods.
  method: 'post',
  route: '/api/posts',
  params: [id, location],
  query: {
      anAnalyticsThing: {
        // must be using bodyParser middleware with urlencoded method's extended property set to true
        // for nested objects in 'query' to work (it's the default but many examples set this to false):
        // 'bodyParser.urlencoded();' or 'bodyParser.urlencoded({ extended: true});'
        aDeeplyNestedProperty: 'example'
      },
      anotherProperty: 'example2'
  },
  body: blogPost,
  headers: {
    // note you should not set the 'Content-Type' header yourself unless you really think you have to
    // as this is being inferred for you by simple-iso-fetch
    aHeadersProperty: 'value' 
  },
  // when 'includeCreds' property is set to true, credentials will be included in the request no matter
  // where the request is being made to, if this is set to false only 'same-origin' (internal to app) requests
  // will include credentials which means they'll never be included in requests coming from server until Node.js
  // implements native Fetch API. 'credentials' must be included for authentication
  includeCreds: true,
  // FOR ALL RESPONSE TYPES OTHER THAN ARRAYBUFFER YOU DON'T NEED TO USE 'responseType' PROPERTY AS TYPE WILL BE INFERRED.  
  // For an 'arrayBuffer' response this is needed however, as there's no way (that I've found)
  // to infer that a response is an arrayBuffer vs. a blob
  responseType: 'arrayBuffer'
})
.then(res => console.log(res)) // console.logs whatever the response is
.catch(err => console.log(err)); // console.logs whatever the error is
```

## Binding/Unbinding Functions to Responses
```js
import simpleFetch from 'simple-iso-fetch';

// set host to your app's hostname for server-side fetching
simpleFetch.setHostUrl('http://localhost:3000');


// bind function to error response, returns function to stop binding this function (useful for React's ComponentWillUnmount)
const unbindThisErrorFunction = simpleFetch.bindToError(res => {
  console.log('There was an error!');
});

// unbinds the function that was bound above, so it will no longer get run upon error responses
const wasBound = unbindThisErrorFunction();

// the unbinding function returns 'true' if the function it tried to unbind was actually bound when it was called and 'false' if it was not
console.log(wasBound);


// bind function to success response, returns function to unbind this function (useful for React's ComponentWillUnmount)
const unbindThisSuccessFunction = simpleFetch.bindToSuccess(res => {
  console.log('There was a successful response from a fetch!');
});

// unbinds the function that was bound above, so it will no longer get run upon success responses
const wasBound = unbindThisErrorFunction();

// the unbinding function returns 'true' if the function it tried to unbind was actually bound when it was called and 'false' if it was not
console.log(wasBound);


// bind function to all responses (success and error), returns function to unbind this function (useful for React's ComponentWillUnmount)
const unbindThisResponseFunction = simpleFetch.bindToResponse(res => {
  console.log('There was an error or successful response from a fetch!');
})

// unbinds the function that was bound above, so it will no longer get run upon responses
const wasBound = unbindThisErrorFunction();

// the unbinding function returns 'true' if the function it tried to unbind was actually bound when it was called and 'false' if it was not
console.log(wasBound);


// you can reference the arrays of bound functions with the below properties, note that if you modify these arrays directly and affect order or overwrite functions, your unbind functions will no longer work
simpleFetch.boundToError: [], // array of functions to be called upon error
simpleFetch.boundToSuccess: [], // array of functions to be called upon success responses
simpleFetch.boundToResponse: [], // array of functions to be called upon all responses
```

## License

  [MIT](LICENSE)

[nodei-image]: https://nodei.co/npm/simple-iso-fetch.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/simple-iso-fetch

# simple-iso-fetch
Isomorphic fetch with parsing taken care of for you (based on headers) and response binding built in

[![NPM][nodei-image]][nodei-url]

The new Fetch API is way better than XHR to work with for sure, but theres still a decent way to go to make it dead simple, I've attempted to bridge that gap with this library :).

I have also added the ability to bind functions to be run when API responses are received.  Functions can be bound to error responses, to success responses, and to all responses (both success and error).  See methods for this below 'Making Requests' section.

## Making Requests
```js

import simpleFetch from 'simple-iso-fetch';

// absolute routes are needed server-side until Node.js implements native fetch,
// you can set the base URL for server-side via the method below or with 'process.env.BASE_URL'
simpleFetch.setHostUrl('http://google.com');

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
simpleFetch.setHostUrl('http://localhost:3000');


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
  // can also just use simpleFetch.<lowercase method> instead of simpleFetch.makeRequest for
  // for GET, PUT, and POST, DELETE uses the simpleFetch 'del' method as 'delete' is a reserved word.
  // The makeRequest method allows you to specify the method and therefore allows for less common methods
  method: 'post',
  route: '/api/posts',
  params: [id, location],
  query: {
      anAnalyticsThing: {
        // must be using bodyParser middleware with urlencoded method's extended property set to true
        // for nested objects in query string to work (it's the default but many set this to false):
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

## License

  [MIT](LICENSE)

[nodei-image]: https://nodei.co/npm/webpack.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/webpack

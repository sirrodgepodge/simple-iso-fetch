# simple-iso-fetch
The new Fetch API is way better than XHR to work with for sure, but theres still a decent way to go to make it dead simple, I've attempted to bridge that gap with this library :).

I have also added the ability to bind functions to be run when API responses are received.  Functions can be bound to error responses, to success responses, and to all responses (both success and error).  See methods for this below 'Making Requests' section.

[![NPM][nodei-image]][nodei-url]

# Making Requests
```js
import SimpleIsoFetch from 'simple-iso-fetch';

// absolute routes are needed server-side until Node.js implements native fetch,
// you can set the base URL for server-side via the method below or with 'process.env.BASE_URL'
SimpleIsoFetch.setHost('http://google.com');

simpleIsoFetch = new SimpleIsoFetch(); // SimpleIsoFetch must be instantiated before use, this allows for cookie session handling in universal apps, discussed late

// example usage for get request to 'http://google.com'
simpleIsoFetch.get({
  route: '/'
})
.then(res => {
  console.log(res); // => all html returned from http://google.com 
});

// identical to the above, convenience default for when string is passed to method function
simpleIsoFetch.get('/').then(res => {
  console.log(res); // => all html returned from http://google.com 
});

// set to your app's hostname + port, (if hostname not provided, defaults to localhost, if hostname provided without port, 80 is assumed, if neither hostname nor port provided, http://localhost: + (process.env.PORT || 3000) used, function returns resulting base URL (note this is a static method, on class itself not instance)
SimpleIsoFetch.setHost('http://localhost', 3000);


// normal usage
const aJsonObject = {
  prop: 'example'
}

const exampleParam = 'paramparamparam';

// the below will make a POST request to:
// 'http://localhost:3000/api/paramparamparam?prop=valvalval&prop2=anotherVal'
simpleIsoFetch.post({
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
simpleIsoFetch.put({
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
simpleIsoFetch.del({
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
simpleIsoFetch.makeRequest({
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
import SimpleIsoFetch from 'simple-iso-fetch';

// set host to your app's hostname for server-side fetching
SimpleIsoFetch.setHostUrl('http://localhost:3000');

// make instance
const simpleIsoFetch = new SimpleIsoFetch();

// bind function to error response, returns function to stop binding this function (useful for React's ComponentWillUnmount)
const unbindThisErrorFunction = simpleIsoFetch.bindToError(res => {
  console.log('There was an error!');
});

// unbinds the function that was bound above, so it will no longer get run upon error responses
const wasBound = unbindThisErrorFunction();

// the unbinding function returns 'true' if the function it tried to unbind was actually bound when it was called and 'false' if it was not
console.log(wasBound);


// bind function to success response, returns function to unbind this function (useful for React's ComponentWillUnmount)
const unbindThisSuccessFunction = simpleIsoFetch.bindToSuccess(res => {
  console.log('There was a successful response from a fetch!');
});

// unbinds the function that was bound above, so it will no longer get run upon success responses
const wasBound = unbindThisErrorFunction();

// the unbinding function returns 'true' if the function it tried to unbind was actually bound when it was called and 'false' if it was not
console.log(wasBound);


// bind function to all responses (success and error), returns function to unbind this function (useful for React's ComponentWillUnmount)
const unbindThisResponseFunction = simpleIsoFetch.bindToResponse(res => {
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

# Isomorphic (Universal) Redux use
Not far into making this library I had to solve the problem of being able to pass an instance of "SimpleIsoFetch" throughout my redux application in order to put persist the authentication cookie for server side requests in a universal app.

I provided a solution for this with using redux middleware and also provided a way to put the functions you have bound to API responses on your redux state and modify them with actions.

Note that if you are not using redux or not making a universal app that has authentication, you can still use everything above this point and have a nifty fetching tool, but if you do need to handle the isomorphic redux thing, you're covered below :).

```js
// on your root universal route
app.get('/*', (req, res, next) => {
    const simpleIsoFetch = new SimpleIsoFetch(req);
    const store = configureStore(..., simpleIsoFetch, ...);
    ...
}); 
```
### Use with redux-thunk
```js
// in 'configureStore' file/function
import thunk from 'redux-thunk';
import { simpleIsoFetchThunk } from 'simple-iso-fetch';
import rootReducer from '../reducers';

export function configureStore(..., simpleIsoFetchInstance, ...) {
  const finalCreateStore = applyMiddleware(simpleIsoFetchThunk(simpleFetch), thunk, ...)(createStore);
  const store = finalCreateStore(rootReducer, initialState);
  return store
}

// Your async action creators will now be curried with 'simpleIsoFetch' preceding 'dispatch', see example async action creator below
...
export function logIn(body) {
  return simpleIsoFetch => dispatch =>
    simpleIsoFetch.post({
      route: '/api/login',
      body
    })
    .then(({body: user}) =>
      dispatch({
        type: 'LOGIN_SUCCESS',
        user
      })
    .catch(error => {
      dispatch({
        type: 'LOGIN_FAIL',
        error
      })
    });
}
...
```
## Adding API response function bindings to Redux state
In order to still have functions bound to API responses on our instance and have those carried through our isomorphic app we need to place the arrays of bound functions ('boundToError', 'boundToSuccess', and 'boundToResponse') on our redux state and make them modifiable with actions, here's how we do it

### Attaching to Redux root Reducer
```js
/// in root reducer file
import { bindingsReducer } from simpleIsoFetch;
...
/// assuming you're using 'combineReducers'
export default combineReducers({
  ...
  simpleIsoFetch: bindingsReducer  // simpleIsoFetch is expected name, can be modified
})
```
### Initialization on Redux state
```js
import SimpleIsoFetch, { syncBindingsWithStore } from '../shared/lib/api';

// create simpleIsoFetch instance
const simpleIsoFetch = new SimpleIsoFetch();

// configure store
const store = configureStore(..., simpleIsoFetch, ...);

// feed store and instance into 'syncBindingsWithStore' function to place 'boundToError', 'boundToSuccess', and 'boundToResponse' arrays on state
syncBindingsWithStore(simpleIsoFetch, store);
```
### Binding functions to API responses
Here is an example of how to send a 'react-toastr' (http://tomchentw.github.io/react-toastr/) message upon error responses with a status code of 500 or greater
```js
// react-toastr library needs
import {
  ToastContainer,
  ToastMessage,
} from 'react-toastr';
const ToastMessageAnim = ToastMessage.animation;

// used to create actions to bind functions to API call responses
import { bindToErrorAction, unbindFromErrorAction } from 'simple-iso-fetch';


@connect()
export default class App extends Component {
  static propTypes = {
    dispatch: PropTypes.func,
    children: PropTypes.object.isRequired
  }

  componentDidMount() {
    // function for creating toast errors upon responses with status of 500 or greater
    this.errorToastFunc = (res) => {
    res.status >= 500 &&
    (res.body.errors || [{errorMessage: res.body}]).forEach(error =>
      this.refs.container.error(
        process.env.NODE_ENV === 'production' ?
        'Sorry! ...please refresh the page' :
        `${error.errorCode || 500}: ${error.errorMessage} \n ${res.method},${res.url}`,
        `${res.body && res.body.status || res.status || 500} (internal)` || 'There was a server-side error',
        {closeButton: true}
      ));
    }
  
    // transform response
    this.props.dispatch(bindToErrorAction(this.errorToastFunc));
  }

  componentWillUnmount() {
    // this is needed to avoid binding twice on hot reloading (good in principal regardless)
    this.props.dispatch(unbindFromErrorAction(this.errorToastFunc));
  }

  render() {
    return (
      <div>
        <ToastContainer
          toastMessageFactory={props =>
            <ToastMessageAnim {...props}
              className='slide'
              transition='slide'
              timeOut={6000}/>}
          ref='container'
          className='toast-top-right'/>
          {this.props.children}
      </div>
    );
  }
}
```

## License

  [MIT](LICENSE)

[nodei-image]: https://nodei.co/npm/simple-iso-fetch.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/simple-iso-fetch

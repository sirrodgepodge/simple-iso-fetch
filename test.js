var fetch = require('./');

console.log(fetch);

fetch.setHostUrl('http://google.com');

fetch.get('/').then(function(res) {
  console.log(res);
});

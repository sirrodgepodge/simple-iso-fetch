var dupeSlash = /(\/+)/g;
var moreThanThreePeriods = /\.{3,}/g;

// polyfill Array.isArray if necessary
if (!Array.isArray) {
  Array.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

// works just like Node.js's native path library's 'join' function with the bonus of handling arrays
function pathJoin() {
  return Array.prototype.slice.call(arguments).map(function(val) {
    return val = typeof val === 'string' ? "" + val : // if string or number just keep as is
      Array.isArray(val) ? pathJoin.apply(null, val) : // handle array with recursion
      (console.error || console.log)('tried to join something other than a string or array, it was ignored in pathJoin\'s result'),
      val && val || '';
  }).join('/').replace(dupeSlash, '/').replace(moreThanThreePeriods, '..'); // join the resulting array together
}

module.exports = pathJoin;

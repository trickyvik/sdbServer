// Wraps an async route handler so rejected promises are passed to
// Express's error handler instead of crashing the process / hanging the request.
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

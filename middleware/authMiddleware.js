// This middleware is now a passthrough since authentication is removed.
module.exports = function (req, res, next) {
  // Authentication is disabled.
  next();
};
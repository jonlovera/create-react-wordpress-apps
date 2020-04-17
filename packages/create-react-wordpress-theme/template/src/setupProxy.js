const proxy = require("http-proxy-middleware");

module.exports = function(app) {
  const wordpress = proxy({
    target: "http://localhost",
    changeOrigin: true
  });

  app.use("/api", wordpress);
  app.use("/wp-admin", wordpress);
  app.use("/wp-content", wordpress);
  app.use("/wp-includes", wordpress);
  app.use("/*.php", wordpress);
  app.use("/*.xml", wordpress);
};

const {
  override,
  addWebpackPlugin,
  overrideDevServer,
  watchAll
} = require("customize-cra");
const path = require("path");
const injectScripts = require("webpack-dev-server-inject-scripts");

const rootPath = process.cwd();

const setDevServerConfig = config => {
  config.contentBase = false;
  config.watchContentBase = false;
  config.proxy = {
    "/": {
      target: "http://localhost",
      changeOrigin: false
    }
  };

  config.index = "";
  config.historyApiFallback = true;

  // console.log("config", config);
  // process.exit(1);
  return config;
};

const setWebpackConfig = config => {
  config.output.path = path.join(rootPath, "api", "build");
  const ManifestPlugin = config.plugins.find(
    plugin => plugin.constructor.name === "ManifestPlugin"
  );
  ManifestPlugin.opts.writeToFileEmit = true;

  // console.log("config", config);
  // process.exit(1);
  return config;
};

const loadReactWordpressApp = options => config => {
  if (!config.plugins) return setDevServerConfig(config);

  return setWebpackConfig(config);
};

module.exports = {
  webpack: override(loadReactWordpressApp()),
  devServer: overrideDevServer(
    loadReactWordpressApp(),

    // dev server plugin
    watchAll()
  )
  // devServer: function(configFunction) {
  //   return function(proxy, allowedHost) {
  //     proxy = {
  //       "/": {
  //         target: "http://localhost",
  //         changeOrigin: false
  //       }
  //     };
  //
  //     const config = configFunction(proxy, allowedHost);
  //     const before = config.before;
  //     // config.contentBasePublicPath = false;
  //     config.contentBase = false;
  //     config.watchContentBase = false;
  //     config.index = "";
  //     config.port = 3000;
  //     config.historyApiFallback = true;
  //     config.before = function(app, server, compiler) {
  //       // before();
  //       const options = {
  //         ignoredPaths: [/\/wp-login/, /\/wp-admin/]
  //       };
  //       // app.use(injectScripts(compiler, options));
  //     };
  //     console.log("config", config);
  //     // process.exit(1);
  //     return config;
  //   };
  // }
};

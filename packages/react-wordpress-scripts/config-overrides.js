const ManifestPlugin = require("webpack-manifest-plugin");
const {
  override,
  addWebpackPlugin,
  overrideDevServer,
  watchAll
} = require("customize-cra");

module.exports = {
  webpack: override(),
  devServer: overrideDevServer(
    addWebpackPlugin(
      new ManifestPlugin({
        basePath: config.output.publicPath,
        fileName: "asset-manifest.json",
        writeToFileEmit: true
      })
    ),
    // dev server plugin
    watchAll()
  )
};

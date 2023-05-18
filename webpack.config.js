const path = require('path');

module.exports = {
  entry: {
    "flottplot": "./src/bundles/flottplot.ts",
    "flottplot-scan": "./src/bundles/flottplot-scan.ts",
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "dist/[name].js",
    library: "flottplot",
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  devServer: {
    static: path.join(__dirname, "dist"),
    compress: true,
    port: 4000,
  },
};


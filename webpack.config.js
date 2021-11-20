const path = require('path');
const VueLoaderPlugin = require('vue-loader-v16/dist/plugin.js').default
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
  devtool: 'cheap-module-eval-source-map',
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/'
  },
  devServer: {
    hot: true,
    port: 3000
  },
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /(pdf|pdf_viewer)\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ["@babel/plugin-proposal-optional-chaining",
              "@babel/plugin-proposal-nullish-coalescing-operator"]
          }
        }
      },
      {
        test: /\.js$/,
        use: ['babel-loader'],

        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              postcssOptions: {
                path: 'postcss.config.js',
              },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ['file-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: ['file-loader'],
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader-v16'
      }
    ],
  },
  optimization: {
    minimize: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './index.html'),
    }),
    new VueLoaderPlugin()
  ],
};
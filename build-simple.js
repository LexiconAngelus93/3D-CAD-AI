const webpack = require('webpack');
const path = require('path');

const config = {
  mode: 'development',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  devtool: 'source-map',
  stats: 'minimal'
};

webpack(config, (err, stats) => {
  if (err || stats.hasErrors()) {
    console.error('Build failed');
    if (err) console.error(err);
    if (stats) console.error(stats.toString());
  } else {
    console.log('Build successful');
  }
});

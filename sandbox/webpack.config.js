var devServer,
    webpack,
    path,
    WriteFileWebpackPlugin;

webpack = require('webpack');
path = require('path');
WriteFileWebpackPlugin = require('./../dist');

devServer = {
    outputPath: path.join(__dirname, './dist'),
    contentBase: path.resolve(__dirname, './src'),
    colors: true,
    quiet: false,
    noInfo: false,
    publicPath: '/static/',
    historyApiFallback: true,
    host: '127.0.0.1',
    port: 8000,
    hot: false
};

module.exports = {
    devtool: 'source-map',
    debug: false,
    devServer: devServer,
    context: path.resolve(__dirname, './src'),
    entry: {
        foo: './app',
        bar: './app'
    },
    output: {
        path: devServer.outputPath,
        filename: '[name].js',
        publicPath: devServer.publicPath
    },
    plugins: [
        new WriteFileWebpackPlugin({
            test: /foo/,
            outputPath: devServer.outputPath,
        })
    ]
};

'use strict';

const path = require('path');
const WriteFileWebpackPlugin = require('./../dist/WriteFileWebpackPlugin.js');
const del = require('del');

const outputPath = path.join(__dirname, './dist');
const publicPath = '/static/';
const devServer = {
    contentBase: path.resolve(__dirname, './src'),
    quiet: false,
    noInfo: false,
    publicPath,
    historyApiFallback: true,
    host: '127.0.0.1',
    port: 8000,
    hot: false
};

del.sync(path.join(outputPath, '**/*'));

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    devServer: devServer,
    context: path.resolve(__dirname, './src'),
    entry: {
        foo: './app',
        bar: './app'
    },
    output: {
        path: outputPath,
        filename: '[name].js',
        publicPath
    },
    plugins: [
        new WriteFileWebpackPlugin({
            test: /foo/
        })
    ]
};

const path = require('path');
const exclude = '/node_modules';

module.exports = {
    mode: process.env.NODE_ENV,
    // target: 'node',
    resolve: {
        extensions: ['.js', '.jsx', '.tsx', '.ts']
    },
    entry: {
        index: ['./index.ts'],
        // vm: ['./src/js/core/rvm/vmWorker.ts'],
    },
    output: {
        path: path.resolve(__dirname, './build/'),
        libraryTarget: 'umd',
        filename: '[name].js',
        publicPath: '/build/',
    },
    module: {
        rules: [
            // {
            //     loader: 'workerize-loader',
            //     options: { inline: true }
            // },
            {
                type: 'javascript/auto',
                test: /\.mjs$/,
                use: [],
            },
            {
                test: /\.(png|gif|svg)$/i,
                loader: 'url-loader',
                options: {
                    limit: 100000,
                },
            },
            {
                test: /\.(js|jsx)$/,
                exclude,
                loader: 'babel-loader',
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: [
                    path.resolve(__dirname, './node_modules'),
                ],
            },
        ],
    },
};

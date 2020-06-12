const DeclarationBundlerPlugin = require('@jmurp7385/declaration-bundler-webpack-plugin');
const path = require('path');
const exclude = '/node_modules';

module.exports = {
    mode: process.env.NODE_ENV,
    // target: 'node',
    resolve: {
        extensions: ['.js', '.jsx', '.tsx', '.ts']
    },
    optimization: {
        minimize: false,
    },
    entry: {
        kernel: ['./src/index.ts'],
        'process.worker': ['./src/process.worker.ts'],
        'filesystem.worker': ['./src/filesystem.worker.ts'],
    },
    output: {
        path: path.resolve(__dirname, './build/'),
        libraryTarget: 'this',
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
    plugins: [
        new DeclarationBundlerPlugin({
            moduleName:'@playos/kernel',
            out:'./kernel.d.ts',
        })
    ]
};

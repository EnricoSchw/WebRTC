const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        app: './src/app.js'
    },
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: [
                    new RegExp(`${__dirname}/node_modules/(?!js-utils)`)
                ],
                loader: 'babel-loader',
                options: {
                    plugins: [
                        require.resolve('@babel/plugin-transform-flow-strip-types'),
                        require.resolve('@babel/plugin-proposal-class-properties'),
                        require.resolve('@babel/plugin-proposal-export-default-from'),
                        require.resolve('@babel/plugin-proposal-export-namespace-from'),
                        require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
                        require.resolve('@babel/plugin-proposal-optional-chaining')
                    ],
                    presets: [
                        [
                            require.resolve('@babel/preset-env'),

                            // Tell babel to avoid compiling imports into CommonJS
                            // so that webpack may do tree shaking.
                            {
                                modules: false,

                                // Specify our target browsers so no transpiling is
                                // done unnecessarily. For browsers not specified
                                // here, the ES2015+ profile will be used.
                                targets: {
                                    chrome: 58,
                                    electron: 2,
                                    firefox: 54,
                                    safari: 11
                                }

                            }
                        ],
                        require.resolve('@babel/preset-flow'),
                        require.resolve('@babel/preset-react')
                    ]
                }
            },
        ],
    },
    node: {
        // Allow the use of the real filename of the module being executed. By
        // default Webpack does not leak path-related information and provides a
        // value that is a mock (/index.js).
        __filename: true
    },
    devServer: {
        contentBase: './dist'
    },
    plugins: [
        new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
        new CopyPlugin([{
            from: './*.html'
        }]),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/',
        sourceMapFilename: '[name].js.map'
    },
};

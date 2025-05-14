const path = require('path');

module.exports = [{
    target: "electron-renderer",
    devtool: 'source-map',
    mode: 'development',
    entry: {
        app: './src',
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, 'public/build'),
        globalObject: 'this'
    },
    resolve: {
        modules: [
            path.resolve(__dirname, "src"),
            "node_modules",
        ],
        extensions: [".js", ".mjs", ".jsx"]
    },
    module: {
        rules: [
            {
                test: /\.js?$/,
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
                            postcssOptions: {
                                config: path.resolve(__dirname, 'postcss.config.cjs'),
                            },
                        }
                    }
                ],
            }
        ]
    },
    plugins: []
}]
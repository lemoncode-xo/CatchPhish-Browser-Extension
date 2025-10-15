const path = require('path');
const webpack = require('webpack');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
    entry: {
        popup: path.resolve(__dirname, 'src', 'index.js')
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    plugins: [
        // Why this approach
        // Browser extensions can't access process.env at runtime. 
        // We inject the API base at build time into the bundle, so the popup script uses a compiled-in constant 
        // without leaking secrets to git (the real key lives in .env which is in .gitignore).
        // Using DefinePlugin is the standard, simple method to replace constants at build time.
        new webpack.DefinePlugin({
            __IPQS_API_BASE__: JSON.stringify(process.env.IPQS_API_BASE || 'https://ipqualityscore.com/api/json/url/REPLACE_ME')
        })
    ],
    module: {
        rules: []
    },
    resolve: {
        extensions: ['.js']
    }
};

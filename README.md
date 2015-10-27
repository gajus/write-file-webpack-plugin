# write-file-webpack-plugin

[![NPM version](http://img.shields.io/npm/v/write-file-webpack-plugin.svg?style=flat)](https://www.npmjs.com/package/write-file-webpack-plugin)
[![js-canonical-style](https://img.shields.io/badge/code%20style-canonical-brightgreen.svg?style=flat)](https://github.com/gajus/canonical)

Forces webpack-dev-server to write bundle files to the file system.

## Install

```sh
npm install write-file-webpack-plugin --save-dev
```

## Usage

```js
import WriteFilePlugin from 'write-file-webpack-plugin';

export default {
    // ...
    plugins: [
        new WriteFilePlugin()
    ]
}
```

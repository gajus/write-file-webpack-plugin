import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import {
    createHash
} from 'crypto';

let isMemoryFileSystem;

/**
 * When 'webpack' program is used, constructor name is equal to 'NodeOutputFileSystem'.
 * When 'webpack-dev-server' program is used, constructor name is equal to 'MemoryFileSystem'.
 *
 * @param {Object} outputFileSystem
 * @returns {boolean}
 */
isMemoryFileSystem = (outputFileSystem) => {
    return outputFileSystem.constructor.name === 'MemoryFileSystem';
};

/**
 * @typedef {Object} options
 * @property {RegExp} test A regular expression used to test if file should be written. When not present, all bundle will be written.
 * @property {boolean} useHashIndex Use hash index to write only files that have changed since the last iteration (default: true).
 */

/**
 * @param {options} options
 * @returns {Object}
 */
export default (options = {}) => {
    let apply,
        hashIndex;

    if (_.has(options, 'test') && !_.isRegExp(options.test)) {
        throw new Error('options.test value must be an instance of RegExp.');
    } else {
        options.test = null;
    }

    if (_.has(options, 'useHashIndex') && !_.isBoolean(options.useHashIndex)) {
        throw new Error('options.useHashIndex value must be of boolean type.');
    } else {
        options.useHashIndex = true;
    }

    hashIndex = {};

    apply = (compiler) => {
        compiler.plugin('done', (stats) => {
            let files,
                outputPath;

            if (!isMemoryFileSystem(compiler.outputFileSystem)) {
                return;
            }

            if (stats.compilation.errors.length) {
                return;
            }

            if (!compiler.options.devServer.outputPath) {
                throw new Error('devServer.outputPath is not defined.');
            }

            outputPath = compiler.options.devServer.outputPath;

            files = _.map(stats.compilation.assets, 'existsAt');

            _.forEach(files, (relativeAssetPath) => {
                let assetBody,
                    assetBodyHash,
                    assetAbsolutePath,
                    outputFilePath;

                if (options.test && !options.test.test(relativeAssetPath)) {
                    return;
                }

                assetAbsolutePath = path.join(compiler.options.output.path, relativeAssetPath);
                assetBody = compiler.outputFileSystem.readFileSync(assetAbsolutePath, 'utf8');

                if (options.useHashIndex) {
                    assetBodyHash = createHash('sha256').update(assetBody).digest('hex');

                    if (hashIndex[relativeAssetPath] && hashIndex[relativeAssetPath] === assetBodyHash) {
                        return;
                    }

                    hashIndex[relativeAssetPath] = assetBodyHash;
                }

                outputFilePath = path.join(outputPath, relativeAssetPath);

                mkdirp.sync(path.dirname(outputFilePath));

                fs.writeFileSync(outputFilePath, assetBody);
            });
        });
    };

    return {
        apply
    };
};

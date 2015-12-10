import _ from 'lodash';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import mkdirp from 'mkdirp';

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
 */

/**
 * @param {options} options
 * @returns {Object}
 */
export default (options = {}) => {
    let previousBodyHash = {};
    let apply;

    if (options.test && !_.isRegExp(options.test)) {
        throw new Error('options.test value must be an instance of RegExp.');
    }

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

            mkdirp.sync(outputPath);

            files = _.map(stats.compilation.chunks, 'files');
            files = _.flatten(files);

            _.forEach(files, (bundleFileName) => {
                let bundleBody,
                    bundleBodyHash,
                    bundleFilePath,
                    outputFilePath;

                if (options.test && !options.test.test(bundleFileName)) {
                    return;
                }

                bundleFilePath = path.join(compiler.options.output.path, bundleFileName);
                bundleBody = compiler.outputFileSystem.readFileSync(bundleFilePath);
                bundleBodyHash = crypto.createHash('md5').update(bundleBody).digest('hex');
                outputFilePath = path.join(outputPath, bundleFileName);

                if (previousBodyHash[outputFilePath] === bundleBodyHash) {
                    return
                }

                previousBodyHash[outputFilePath] = bundleBodyHash;
                fs.writeFileSync(outputFilePath, bundleBody);
            });
        });
    };

    return {
        apply
    };
};

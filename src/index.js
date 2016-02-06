import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import {
    createHash
} from 'crypto';
import chalk from 'chalk';
import moment from 'moment';
import filesize from 'filesize';

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
 * @property {boolean} log Logs names of the files that are being written (or skipped because they have not changed) (default: true).
 */

/**
 * @param {options} userOptions
 * @returns {Object}
 */
export default (userOptions = {}) => {
    let apply,
        assetSourceHashIndex,
        log,
        options;

    options = _.assign({}, {
        log: true,
        test: null,
        useHashIndex: true
    }, userOptions);

    if (!_.isNull(options.test) && !_.isRegExp(options.test)) {
        throw new Error('options.test value must be an instance of RegExp.');
    }

    if (!_.isBoolean(options.useHashIndex)) {
        throw new Error('options.useHashIndex value must be of boolean type.');
    }

    if (!_.isBoolean(options.log)) {
        throw new Error('options.log value must be of boolean type.');
    }

    log = (...append) => {
        if (!options.log) {
            return;
        }

        /* eslint-disable no-console */
        console.log(chalk.dim('[' + moment().format('HH:mm:ss') + '] [write-file-webpack-plugin]'), ...append);
        /* eslint-enable no-console */
    };

    assetSourceHashIndex = {};

    log('options', options);

    apply = (compiler) => {
        let outputPath,
            setup,
            setupDone,
            setupStatus;

        setup = () => {
            if (setupDone) {
                return setupStatus;
            }

            setupDone = true;

            log('compiler.outputFileSystem is "' + chalk.cyan(compiler.outputFileSystem.constructor.name) + '".');

            if (!isMemoryFileSystem(compiler.outputFileSystem)) {
                return;
            }

            if (!compiler.options.devServer.outputPath) {
                throw new Error('devServer.outputPath is not defined.');
            }

            outputPath = compiler.options.devServer.outputPath;

            log('compiler.options.devServer.outputPath is "' + chalk.cyan(compiler.options.devServer.outputPath) + '".');

            setupStatus = true;

            return setupStatus;
        };

        compiler.plugin('done', (stats) => {
            if (!setup()) {
                return;
            }

            if (stats.compilation.errors.length) {
                return;
            }

            log('stats.compilation.errors.length is "' + chalk.cyan(stats.compilation.errors.length) + '".');

            _.forEach(stats.compilation.assets, (asset, assetPath) => {
                let assetSize,
                    assetSource,
                    assetSourceHash,
                    outputFilePath,
                    relativeOutputPath,
                    targetDefinition;

                outputFilePath = path.join(outputPath, assetPath);
                relativeOutputPath = path.relative(process.cwd(), outputFilePath);

                targetDefinition = 'asset: ' + chalk.cyan('./' + assetPath) + '; destination: ' + chalk.cyan('./' + relativeOutputPath);

                if (options.test && !options.test.test(assetPath)) {
                    log(targetDefinition, chalk.yellow('[skipped; does not match test]'));

                    return;
                }

                assetSize = asset.size();
                assetSource = asset.source();

                if (options.useHashIndex) {
                    assetSourceHash = createHash('sha256').update(assetSource).digest('hex');

                    if (assetSourceHashIndex[assetPath] && assetSourceHashIndex[assetPath] === assetSourceHash) {
                        log(targetDefinition, chalk.yellow('[skipped; matched hash index]'));

                        return;
                    }

                    assetSourceHashIndex[assetPath] = assetSourceHash;
                }

                log(targetDefinition, chalk.green('[written]'), chalk.magenta('(' + filesize(assetSize) + ')'));

                mkdirp.sync(path.dirname(relativeOutputPath));

                fs.writeFileSync(relativeOutputPath, assetSource);
            });
        });
    };

    return {
        apply
    };
};

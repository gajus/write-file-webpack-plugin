import fs from 'fs';
import {
    createHash
} from 'crypto';
import path from 'path';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import chalk from 'chalk';
import moment from 'moment';
import filesize from 'filesize';
import createDebug from 'debug';

const debug = createDebug('write-file-webpack-plugin');

/**
 * When 'webpack' program is used, constructor name is equal to 'NodeOutputFileSystem'.
 * When 'webpack-dev-server' program is used, constructor name is equal to 'MemoryFileSystem'.
 */
const isMemoryFileSystem = (outputFileSystem: Object): boolean => {
  return outputFileSystem.constructor.name === 'MemoryFileSystem';
};

/**
 * @typedef {Object} options
 * @property {boolean} exitOnErrors Stop writing files on webpack errors (default: true).
 * @property {boolean} force Forces the execution of the plugin regardless of being using `webpack-dev-server` or not (default: false).
 * @property {boolean} log Logs names of the files that are being written (or skipped because they have not changed) (default: true).
 * @property {RegExp} test A regular expression used to test if file should be written. When not present, all bundle will be written.
 * @property {boolean} useHashIndex Use hash index to write only files that have changed since the last iteration (default: true).
 */
type UserOptionsType = {
  exitOnErrors: ?boolean,
  test: ?RegExp,
  useHashIndex: ?boolean,
  log: ?boolean,
  force: ?boolean
};

export default (userOptions: UserOptionsType = {}): Object => {
  const options = _.assign({}, {
    exitOnErrors: true,
    force: false,
    log: true,
    test: null,
    useHashIndex: true
  }, userOptions);

  if (!_.isBoolean(options.exitOnErrors)) {
    throw new Error('options.exitOnErrors value must be of boolean type.');
  }

  if (!_.isBoolean(options.force)) {
    throw new Error('options.force value must be of boolean type.');
  }

  if (!_.isBoolean(options.log)) {
    throw new Error('options.log value must be of boolean type.');
  }

  if (!_.isNull(options.test) && !_.isRegExp(options.test)) {
    throw new Error('options.test value must be an instance of RegExp.');
  }

  if (!_.isBoolean(options.useHashIndex)) {
    throw new Error('options.useHashIndex value must be of boolean type.');
  }

  const log = (...append) => {
    if (!options.log) {
      return;
    }

    debug(chalk.dim('[' + moment().format('HH:mm:ss') + '] [write-file-webpack-plugin]'), ...append);
  };

  const assetSourceHashIndex = {};

  log('options', options);

  const apply = (compiler) => {
    let outputPath,
      setupDone,
      setupStatus;

    const setup = (): boolean => {
      if (setupDone) {
        return setupStatus;
      }

      setupDone = true;

      log('compiler.outputFileSystem is "' + chalk.cyan(compiler.outputFileSystem.constructor.name) + '".');

      if (!isMemoryFileSystem(compiler.outputFileSystem) && !options.force) {
        return false;
      }

      if (_.has(compiler, 'options.output.path') && compiler.options.output.path !== '/') {
        outputPath = compiler.options.output.path;
      }

      if (!outputPath) {
        throw new Error('output.path is not defined. Define output.path.');
      }

      log('outputPath is "' + chalk.cyan(outputPath) + '".');

      setupStatus = true;

      return setupStatus;
    };

    compiler.plugin('done', (stats) => {
      if (!setup()) {
        return;
      }

      if (options.exitOnErrors && stats.compilation.errors.length) {
        return;
      }

      log('stats.compilation.errors.length is "' + chalk.cyan(stats.compilation.errors.length) + '".');

      _.forEach(stats.compilation.assets, (asset, assetPath) => {
        const outputFilePath = path.isAbsolute(assetPath) ? assetPath : path.join(outputPath, assetPath);
        const relativeOutputPath = path.relative(process.cwd(), outputFilePath);
        const targetDefinition = 'asset: ' + chalk.cyan('./' + assetPath) + '; destination: ' + chalk.cyan('./' + relativeOutputPath);

        if (options.test && !options.test.test(assetPath)) {
          log(targetDefinition, chalk.yellow('[skipped; does not match test]'));

          return;
        }

        const assetSize = asset.size();
        const assetSource = Array.isArray(asset.source()) ? asset.source().join('\n') : asset.source();

        if (options.useHashIndex) {
          const assetSourceHash = createHash('sha256').update(assetSource).digest('hex');

          if (assetSourceHashIndex[assetPath] && assetSourceHashIndex[assetPath] === assetSourceHash) {
            log(targetDefinition, chalk.yellow('[skipped; matched hash index]'));

            return;
          }

          assetSourceHashIndex[assetPath] = assetSourceHash;
        }

        mkdirp.sync(path.dirname(relativeOutputPath));

        try {
          fs.writeFileSync(relativeOutputPath.split('?')[0], assetSource);
          log(targetDefinition, chalk.green('[written]'), chalk.magenta('(' + filesize(assetSize) + ')'));
        } catch (exp) {
          log(targetDefinition, chalk.bold.red('[is not written]'), chalk.magenta('(' + filesize(assetSize) + ')'));
          log(chalk.bold.bgRed('Exception:'), chalk.bold.red(exp.message));
        }
      });
    });
  };

  return {
    apply
  };
};

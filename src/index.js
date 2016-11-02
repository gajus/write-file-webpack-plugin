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

/**
 * When 'webpack' program is used, constructor name is equal to 'NodeOutputFileSystem'.
 * When 'webpack-dev-server' program is used, constructor name is equal to 'MemoryFileSystem'.
 */
const isMemoryFileSystem = (outputFileSystem: Object): boolean => {
  return outputFileSystem.constructor.name === 'MemoryFileSystem';
};

/**
 * @property test A regular expression used to test if file should be written. When not present, all bundle will be written.
 * @property useHashIndex Use hash index to write only files that have changed since the last iteration (default: true).
 * @property log Logs names of the files that are being written (or skipped because they have not changed) (default: true).
 * @property exitOnErors Stop writing files on webpack errors (default: true).
 */
type UserOptionsType = {
  exitOnErrors: ?boolean,
  test: ?RegExp,
  useHashIndex: ?boolean,
  log: ?boolean
};

export default (userOptions: UserOptionsType = {}): Object => {
  const options = _.assign({}, {
    exitOnErrors: true,
    force: false,
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

  if (!_.isBoolean(options.exitOnErrors)) {
    throw new Error('options.exitOnErrors value must be of boolean type.');
  }

  if (!_.isBoolean(options.force)) {
    throw new Error('options.force value must be of boolean type.');
  }

  const log = (...append) => {
    if (!options.log) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(chalk.dim('[' + moment().format('HH:mm:ss') + '] [write-file-webpack-plugin]'), ...append);
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

      // https://github.com/gajus/write-file-webpack-plugin/issues/1
      // `compiler.options.output.path` will be hardcoded to '/' in
      // webpack-dev-server's command line wrapper. So it should be
      // ignored here.
      if (_.has(compiler, 'options.output.path') && compiler.options.output.path !== '/') {
        outputPath = compiler.options.output.path;
      }

      if (!outputPath) {
        if (!_.has(compiler, 'options.devServer.outputPath')) {
          throw new Error('output.path is not accessible and devServer.outputPath is not defined. Define devServer.outputPath.');
        }

        outputPath = compiler.options.devServer.outputPath;
      }

      log('compiler.options.devServer.outputPath is "' + chalk.cyan(outputPath) + '".');

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
        const outputFilePath = path.join(outputPath, assetPath);
        const relativeOutputPath = path.relative(process.cwd(), outputFilePath);
        const targetDefinition = 'asset: ' + chalk.cyan('./' + assetPath) + '; destination: ' + chalk.cyan('./' + relativeOutputPath);

        if (options.test && !options.test.test(assetPath)) {
          log(targetDefinition, chalk.yellow('[skipped; does not match test]'));

          return;
        }

        const assetSize = asset.size();
        const assetSource = asset.source();

        if (options.useHashIndex) {
          const assetSourceHash = createHash('sha256').update(assetSource).digest('hex');

          if (assetSourceHashIndex[assetPath] && assetSourceHashIndex[assetPath] === assetSourceHash) {
            log(targetDefinition, chalk.yellow('[skipped; matched hash index]'));

            return;
          }

          assetSourceHashIndex[assetPath] = assetSourceHash;
        }

        log(targetDefinition, chalk.green('[written]'), chalk.magenta('(' + filesize(assetSize) + ')'));

        mkdirp.sync(path.dirname(relativeOutputPath));

        fs.writeFileSync(relativeOutputPath.split('?')[0], assetSource);
      });
    });
  };

  return {
    apply
  };
};

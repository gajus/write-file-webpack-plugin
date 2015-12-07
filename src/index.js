import _ from 'lodash';
import fs from 'fs';
import path from 'path';

let apply;

apply = (compiler) => {
    compiler.plugin('done', (stats) => {
        let files;

        if (stats.compilation.errors.length) {
            return;
        }

        files = _.map(stats.compilation.chunks, 'files');

        _.forEach(files, (fileName) => {
            let filePath;

            if (!compiler.options.output.path) {
                throw new Error('output.path is not defined.');
            }

            filePath = path.join(compiler.options.output.path, fileName);

            compiler.outputFileSystem.readFile(filePath, 'utf-8', (errorRead, body) => {
                if (errorRead) {
                    throw new Error('Cannot read input file.');
                }

                fs.writeFileSync(filePath, body);
            });
        });
    });
};

export default () => {
    return {
        apply
    };
};

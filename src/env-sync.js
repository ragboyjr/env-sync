#!/usr/bin/env node
/** env-sync.js
    env-sync.js is responsible for managing the .env file from the .env.example.
    It configures and sets secret keys for the .env and it also will remove and
    add env vars depending on if any were added or removed from the .env.example
*/

const fs = require('fs');
const path = require('path');
const assign = require('lodash.assign');
const ParsedFile = require('./parsed-file').ParsedFile;

function fileVar(name, lineNo, val) {
    return {
        name: name,
        lineNo: lineNo,
        val: val
    };
}

const VarLineRe = /^([A-Z][A-Z_0-9]*)=(.*)/;

function createVarsFromLines(lines) {
    return lines.map((l, i) => [i, l, l.match(VarLineRe)] )
        .filter((tup) => tup[2])
        .reduce((acc, tup) => {
            const fv = fileVar(tup[2][1], tup[0], tup[2][2]);
            acc[fv.name] = fv;
            return acc;
        }, {});
}

function fileExists(filename) {
    return new Promise((resolve, reject) => {
        fs.exists(filename, (exists) => {
            resolve(exists);
        });
    });
}

function parseEnv(envFile) {
    return new Promise((resolve, reject) => {
        fs.readFile(envFile, (err, buf) => {
            if (err) { return reject(err); }
            const lines = buf.toString().split("\n");
            const vars = createVarsFromLines(lines);

            resolve(new ParsedFile(lines, vars));
        });
    });
}

function varsNotInOther(mainFile, otherFile) {
    return Object.keys(mainFile.vars).reduce((acc, key) => {
        if (!otherFile.vars[key]) {
            acc[key] = mainFile.vars[key].val;
        }

        return acc;
    }, {});
}

function mergeEnvFiles(envFile, envExampleFile) {
    if (!envFile) {
        return [envExampleFile, {}, {}];
    }

    const removedVars = varsNotInOther(envFile, envExampleFile);
    const addedVars = varsNotInOther(envExampleFile, envFile);

    Object.keys(envFile.vars).forEach(key => {
        if (!envExampleFile.vars[key]) {
            return;
        }

        envExampleFile.vars[key].val = envFile.vars[key].val;
    });

    return [envExampleFile, addedVars, removedVars];
}

function createMissingVars(varsToCreateSet, createVarsHandler, envFile) {
    const updatedVars = {};
    const promises = Object.keys(envFile.vars).filter(key => {
        return varsToCreateSet.has(key) && !envFile.vars[key].val;
    }).map(key => {
        const handler = (value) => {
            envFile.vars[key].val = value;
            updatedVars[key] = value;
        };

        return createVarsHandler(key).then(handler);
    });

    return Promise.all(promises).then(() => {
        return [envFile, updatedVars];
    });
}

function writeEnv(envPath, envFile) {
    fs.writeFile(envPath, envFile.toEnvFile(), (err) => {
        if (err) {
            console.log('Could not write env file...');
            return;
        }

        console.log('Successfully wrote EnvFile!');
    });
}

function parseEnvs(envPath, envExamplePath) {
    return fileExists(envPath).then((exists) => {
        return Promise.all([
            exists ? parseEnv(envPath) : Promise.resolve(null),
            parseEnv(envExamplePath),
        ]);
    });
}

/** Creates a config structure for env-sync main.
    @param envFilePath          The path to the .env file
    @param varsToCreateSet      A Set of variable names that need to be created
    @param createVarsHandler    A function that accepts a var name and returns a
                                promise with the value to set that var to.
    @param yargs                an instance of yargs, you can leave this empty
*/
function config(envFilePath, varsToCreateSet, createVarsHandler, yargs) {
    return {
        yargs: yargs,
        varsToCreateSet: varsToCreateSet,
        createVarsHandler: createVarsHandler,
        envFilePath: envFilePath,
        envExampleFilePath: envFilePath + '.example',
    };
}

/** create a main controller */
function main(config) {
    const yargs = config.yargs || require('yargs');
    const argv = yargs
        .usage('Usage: $0 [options]')
        .alias('s', 'status')
        .boolean('s')
        .describe('s', 'Only print the status of what env-sync would do. Does not actually write the file')
        .alias('h', 'help')
        .help('h')
        .argv;

    parseEnvs(config.envFilePath, config.envExampleFilePath).then(files => {
        const envFile = files[0];
        const envExampleFile = files[1];
        const tup = mergeEnvFiles(envFile, envExampleFile);
        const mergedEnvFile = tup[0];
        const addedVars = tup[1];
        const removedVars = tup[2];

        if (!envFile) {
            console.log('.env does not exist, copying from .env.example');
        }

        if (argv.status) {
            console.log('Showing status of .env')
        }
        else {
            console.log('Configuring .env');
        }

        if (Object.keys(addedVars).length) {
            console.log('  Added Variables');
            Object.keys(addedVars).forEach(key => {
                console.log('    %s=%s', key, addedVars[key]);
            });
        }
        if (Object.keys(removedVars).length) {
            console.log('  Removed Variables');
            Object.keys(removedVars).forEach(key => {
                console.log('    %s=%s', key, removedVars[key]);
            });
        }

        return createMissingVars(config.varsToCreateSet, config.createVarsHandler, mergedEnvFile);
    }).then(tup => {
        const envFile = tup[0];
        const updatedVars = tup[1];

        if (!Object.keys(updatedVars).length) {
            console.log('  nothing to configure');
        }
        else {
            Object.keys(updatedVars).forEach(key => {
                console.log('  %s: %s', key, updatedVars[key]);
            });
        }

        if (argv.status) {
            return
        }

        envFile.compileVars();
        writeEnv(config.envFilePath, envFile);
    }).then(null, (err) => {
        console.log(err);
    });
}

exports.main = main;
exports.config = config;

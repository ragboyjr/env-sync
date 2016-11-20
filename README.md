# Env Sync

`env-sync.js` is a utility for syncing up dotenv files.

In codebases with larger teams, it can be quite painful to add configuration to the .env file and make sure that every other developer has those values as well. Then throw multiple server environments into the mix, and you'll an env config nightmare.

`env-sync.js` solves this problem by keeping the `.env` files completely in sync with their counterpart `.env.example` file.

This is in .env.example

```
# DB Config
DB_PORT=3306
DB_HOST=localhost
DB_PASSWORD=
```

This is .env

```
OLD_ENV_VAR=

DB_PORT=3305

DB_PASSWORD=abc
```

Now, running env-sync will make sure that the .env file has all of these variables and formatting as is. Any extra variables in the .env file will be removed, and any missing variables will be added. If any variable in the .env already has a value, then it's left as is. So env-sync only overwrites variables if they don't have a value to begin with.

The command would then print out a .env like this:

```
# DB Config
DB_PORT=3305
DB_HOST=localhost
DB_PASSWORD=abc
```

## Usage

First, create a file named `env-sync.js` or whatever else you want to name it for your project. Then you'd fill it with something similar, but with your own config options.

```js
const envSync = require('env-sync');
const crypto = require('crypto');

// calling main to handle actual syncing.
// this will configure the SECRET_KEY var if it is empty
envSync.main(envSync.config('.env', new Set(['SECRET_KEY']), function(key) {
    if (key == 'SECRET_KEY') {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(32, (err, buf) => {
                if (err) { reject(err); }
                resolve(buf.toString('base64'));
            });
        });
    }
}));
```

Here's the signature for `envSync.config`

```
/** Creates a config structure for env-sync main.
    @param envFilePath          The path to the .env file
    @param varsToCreateSet      A Set of variable names that need to be created
    @param createVarsHandler    A function that accepts a var name and returns a
                                promise with the value to set that var to.
    @param yargs                an instance of yargs, you can leave this empty
*/
function config(envFilePath, varsToCreateSet, createVarsHandler, yargs)
```

To run this you just do:

```bash
node env-sync.js
```

And that will automatically sync up your .env and .env.example files.

Here are all the options:

```
Usage: env-sync.js [options]

Options:
  -s, --status  Only print the status of what env-sync would do. Does not
                actually write the file                                [boolean]
  -h, --help    Show help                                              [boolean]  
```

## Example

Here's an example from the `example` dir

```
$ cat .env.example
# DB Config
DB_PORT=3306
DB_HOST=localhost
DB_PASSWORD=

# Secret
SECRET_KEY=
$ cat .env
DB_HOST=mysql
OLD_VAR=1
$ node env-sync.js
Configuring .env
  Added Variables
    DB_PORT=3306
    DB_PASSWORD=
    SECRET_KEY=
  Removed Variables
    OLD_VAR=1
  SECRET_KEY: XqfZjoi4inhEKP3WUT5X0PZ5x2I7xbPvMRAfLkXvudM=
------------
# DB Config
DB_PORT=3306
DB_HOST=mysql
DB_PASSWORD=

# Secret
SECRET_KEY=XqfZjoi4inhEKP3WUT5X0PZ5x2I7xbPvMRAfLkXvudM=
```

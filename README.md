# Vorlon.JS

A new, open source, extensible, platform-agnostic tool for remotely debugging and testing your JavaScript. Powered by node.js and socket.io.

Learn more at [VorlonJS](http://vorlonjs.com).


## Easy setup

Install and run the Vorlon.JS server from npm:

```
$ npm i -g vorlon
$ vorlon
With the server is running, open http://localhost:1337 in your browser to see the Vorlon.JS dashboard.
```

The last step is to enable Vorlon.JS by adding this to your app:

```
<script src="http://localhost:1337/client.js"></script>
```

## Documentation

Read further documentation about Vorlon.JS, and writing your own plugins at [http://vorlonjs.com/documentation](http://vorlonjs.com/documentation).

## Developing on Vorlon.JS

If you wish to work on Vorlon.JS's server or core plugin code, you'll need to clone this directory and work in it.

Vorlon is written in typescript, which is compiled with gulp. There are two main directories:

* [/Server](./Server) contains the code for the vorlon server, and the dashboard code
* [/Plugins](./Plugins) contains the code for vorlon core, and for the plugins

### Compiling from source

There is a `gulpfile.js` in each of the `Plugin` and `Server` directories, which compiles gulp to typescript. In addition, [/Plugins/gulpfile.js](./Plugins/gulpfile.js) ensures that the compiled plugin code is copied in to the right place in the `Server` directory.

#### Compiling

The simplest way to run Vorlon.JS is to run `npm start` from the root directory. This will run both gulpfiles to compile typescript and start the server.

#### `gulp watch`

You can also run the gulp commands individually. This is useful if you wish to work on plugins in particular, as `gulp watch` will compile typescript for you automatically.

If you want to run `gulp` commands from command line, you will need to first install gulp globally on your system with:

```
npm install -g gulp
```

You can now run `gulp watch` from the `Server` or `Plugin` directories to have gulp compile typescript to javascript automatically.

#### Plugin test page

There is a demo webpage that includes the vorlon code that you can open to test the dashboard behaviour. It lives at [./Plugins/samples/index.html](./Plugins/samples/index.html). There is a gulptask in the `Plugins` gulpfile to host it, just run `gulp webserver`, and then navigate to [http://localhost:1338/index.html](http://localhost:1338/index.html) to view the page.

### Visual Studio users

For Visual Studio users, we provide an integrated solution through VorlonJS.sln. In order to interact with Node.js, you just need to install the NodeJS Tool for Visual Studio [plugin](https://nodejstools.codeplex.com/).
Once the plugin is installed, just open the solution and you'll be ready to develop for Vorlon.js.

### Committing & Pull Requests

Once you've made a change, you can commit and submit a pull request to this repository. You will also need to electronically sign the `Microsoft Contributor License Agreement (CLA)[https://cla.microsoft.com/] if you wish for your changes to be merged.

When committing changes, ensure that compiled JavaScript files (those compiled from TypeScript) are not committed, only the original TypeScript files should be committed.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) for more info on contributing to Vorlon.JS.

## License

Vorlon.JS is released under the MIT license. Please see [LICENSE](./LICENSE) for full details.

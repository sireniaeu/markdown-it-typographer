## markdown-it-typographer

This plugin for markdown-it does the same as the `typographer: true` option in markdown-it ... but in a plugin. 

I'm using it with marpit which uses the `commonmark` mode and does now allow the normal markdown-it typographer mode. 

### Example usage

Install via `npm install -save markdown-it-typographer` then configure the plugin in e.g. your `marp.config.js` file:

```js
const { Marp } = require('@marp-team/marp-core')
const typographer = require('markdown-it-typographer')

module.exports = {
  engine: (opts) => new Marp(opts)
    .use(typographer)
}
```

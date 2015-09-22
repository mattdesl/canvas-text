# canvas-text

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

#### work in progress

Easier Canvas2D text rendering.

- multiline text with `\n`
- word-wrapping
- left/center/right alignment
- inline styles
- moar

```js
var createText = require('canvas-text')

var context = require('2d-context')()
var canvas = context.canvas

var text = createText(context, 'some text', {
  width: 200,
  family: '"Open Sans", sans-serif',
  size: 32
})

```

## Usage

[![NPM](https://nodei.co/npm/canvas-text.png)](https://www.npmjs.com/package/canvas-text)

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/canvas-text/blob/master/LICENSE.md) for details.

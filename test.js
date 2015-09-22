var getContext = require('get-canvas-context')
var fitter = require('canvas-fit')
var assign = require('object-assign')

var wordWrap = require('word-wrapper')

var context = getContext('2d')
var canvas = context.canvas
var shape = [600, 550]

fitter(canvas, function () {
  return shape
}, window.devicePixelRatio)()

context.fillStyle = 'white'
context.fillRect(0, 0, canvas.width, canvas.height)

document.body.style.background = 'lightGray'
document.body.appendChild(canvas)

var chunks = [
  { text: 'my lazy', size: 128 },
  { text: ' dog ', size: 42, fillStyle: 'red' },
  { text: 'jumps over', size: 24 }
]

var defaults = {
  baseline: 'alphabetic',
  align: 'left',
  fillStyle: '#000',
  style: 'normal',
  variant: 'normal',
  weight: '400',
  family: '"Ubuntu", sans-serif',
  size: 32
}

loader(getFontStyle(defaults), function (err) {
  if (err) throw err
  render(context)
})

function getFontStyle (opt) {
  var style = opt.style || defaults.style
  var variant = opt.variant || defaults.variant
  var weight = opt.weight || defaults.weight
  var family = opt.family || defaults.family
  var fontSize = typeof opt.size === 'number' ? opt.size : defaults.size
  var fontStyle = [ style, variant, weight, fontSize + 'px', family ].join(' ')
  return fontStyle
}

function getLineHeight (fontSize) {
  return fontSize + 1
}

function setFontParams (opt) {
  context.textAlign = 'left'
  context.textBaseline = opt.baseline || 'alphabetic'
  context.font = opt.font
}

function render (context) {
  var maxHeight = chunks.reduce(function (prev, attrib) {
    var size = typeof attrib.size === 'number' ? attrib.size : defaults.size
    return Math.max(prev, getLineHeight(size))
  }, 0)

  // copy data and prepare defaults to avoid mutating
  // user objects. also cache widths here
  var data = chunks.map(function (attrib) {
    if (typeof attrib === 'string') {
      attrib = { text: attrib }
    }

    attrib = assign({}, defaults, attrib)

    attrib.text = attrib.text || ''
    attrib.font = getFontStyle(attrib)

    // approximate line height from pixel size
    if (typeof attrib.lineHeight === 'undefined') {
      attrib.lineHeight = getLineHeight(attrib.size)
    }

    // gather metrics if we don't have any
    if (!attrib.metrics || typeof attrib.metrics.width !== 'number') {
      setFontParams(attrib)
      attrib.metrics = context.measureText(attrib.text)
    }

    return attrib
  })

  var fullText = getFullText(data)
  var lines = wordWrap.lines(fullText, {
    width: 200,
    measure: measure
  })

  console.log(lines)

  var cursorX = 0
  var cursorY = 0
  data.forEach(function (attrib) {
    var text = attrib.text
    var start = attrib.start || 0
    var end = typeof attrib.end === 'number' ? attrib.end : text.length
    var substr = text.substring(start, end)
    var lineHeight = attrib.lineHeight
    var metrics = attrib.metrics

    var x = cursorX
    var y = cursorY + (maxHeight - lineHeight)
    setFontParams(attrib)
    context.fillStyle = attrib.fillStyle
    context.fillText(substr, x, y + lineHeight)

    context.beginPath()
    context.lineTo(x, y + lineHeight)
    context.lineTo(x + metrics.width, y + lineHeight)
    context.stroke()

    cursorX += metrics.width
  })

  function measure (text, start, end, width) {
    var chunkIndex = 0
    var available = 0
    for (var i = start; i < end; i++) {
    }
  }
}

function getFullText (data) {
  return data.reduce(function (prev, attrib) {
    return prev + attrib.text
  }, '')
}

function loader (font, cb) {
  if (typeof document.fonts !== 'undefined' && typeof document.fonts.load === 'function') {
    document.fonts.load(font)
      .then(function (result) {
        cb(null, result)
      }, function (err) {
        cb(err)
      })
  } else {
    cb(new Error('font loading not supported'))
  }
}

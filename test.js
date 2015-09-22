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
  { text: 'Hello, ', size: 50, fillStyle: 'hsl(100,0%,70%)', weight: 300 },
  {
    text: 'world.', size: 32, fillStyle: 'hsl(0,50%,50%)',
    underline: true, strokeStyle: 'rgba(0,128,255,0.85)', weight: 700
  },
  { text: ' This is some canvas text', size: 32, weight: 300 }
]

var defaults = {
  baseline: 'alphabetic',
  align: 'center',
  fillStyle: '#000',
  style: 'normal',
  variant: 'normal',
  weight: '400',
  family: '"Ubuntu", sans-serif',
  size: 32
}

loader(getFontStyle(defaults), function (err) {
  if (err) throw err
  console.time('render')
  render(context)
  console.timeEnd('render')
})

function getFontStyle (opt) {
  var style = opt.style || defaults.style
  var variant = opt.variant || defaults.variant
  var weight = String(opt.weight || defaults.weight)
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

    return attrib
  })

  var fullText = composeBuffer(data)
  var lines = wordWrap.lines(fullText, {
    width: 500,
    measure: measure
  })

  var originX = 50
  var originY = 50
  var cursorX = 0
  var cursorY = 0

  var maxLineWidth = lines.reduce(function (prev, line) {
    return Math.max(line.width, prev)
  }, 0)

  lines.forEach(function (line, i, list) {
    var start = line.start
    var end = line.end
    var lineWidth = line.width
    var maxAttrHeight = getMaxAttrHeight(data, start, end)

    while (start < end) {
      // find next attribute chunk for this string char
      var attribIdx = indexOfAttribute(data, start)
      if (attribIdx === -1) {
        break
      }

      // for each attribute in this range ...
      var attrib = data[attribIdx]
      var offset = start - attrib.index

      var length = Math.min(attrib.text.length - offset, end - start)
      var text = fullText.substring(start, start + length)
      var lineHeight = attrib.lineHeight

      var x = originX + cursorX
      var y = originY + cursorY + (maxHeight - lineHeight)
      if (defaults.align === 'right') {
        x += (maxLineWidth - lineWidth)
      } else if (defaults.align === 'center') {
        x += (maxLineWidth - lineWidth) / 2
      }

      setFontParams(attrib)
      var textWidth = context.measureText(text).width
      cursorX += textWidth
      context.fillStyle = attrib.fillStyle

      if (attrib.underline) {
        context.beginPath()
        context.strokeStyle = attrib.strokeStyle || attrib.fillStyle
        context.lineWidth = 4
        context.lineCap = 'round'
        context.lineJoin = 'round'
        var offY = y + 4
        context.lineTo(x, offY + lineHeight)
        context.lineTo(x + textWidth, offY + lineHeight)
        context.stroke()
      }

      context.fillText(text, x, y + lineHeight)

      // skip to next chunk
      start = attrib.index + attrib.text.length
      maxAttrHeight = Math.max(maxAttrHeight, attrib.lineHeight)
    }
    cursorX = 0
    cursorY += maxAttrHeight

    var nextLine = list[i + 1]
    if (nextLine) {
      var nextLineHeight = getMaxAttrHeight(data, nextLine.start, nextLine.end)
      cursorY += nextLineHeight - maxAttrHeight
    }
  })

  function measure (text, start, end, width) {
    var availableGlyphs = 0
    var first = start
    var totalWidth = 0

    for (; start < end; start++) {
      // find next attribute chunk for this string char
      var attribIdx = indexOfAttribute(data, start)
      if (attribIdx === -1) {
        break
      }

      // for each attribute in this range ...
      var attrib = data[attribIdx]
      var result = computeAttributeGlyphs(context, fullText, totalWidth, attrib, start, end, width)
      availableGlyphs += result.available
      totalWidth += result.width

      // skip to next attribute
      start += attrib.text.length - 1
    }

    return {
      width: totalWidth,
      start: first,
      end: first + availableGlyphs
    }
  }

}

function getMaxAttrHeight (data, start, end) {
  var maxAttrHeight = 0
  // first we need to compute max attribute height for this line
  while (start < end) {
    // find next attribute chunk for this string char
    var attribIdx = indexOfAttribute(data, start)
    if (attribIdx === -1) {
      break
    }

    // for each attribute in this range ...
    var attrib = data[attribIdx]
    maxAttrHeight = Math.max(attrib.lineHeight, maxAttrHeight)
    start += attrib.text.length
  }
  return maxAttrHeight
}

function computeAttributeGlyphs (context, fullText, prevWidth, attrib, start, end, width) {
  var text = attrib.text
  var length = Math.min(text.length, end - start)

  // determine how many chars in this chunk can be shown
  setFontParams(attrib)
  for (var off = 0; off < length; off++) {
    var substr = fullText.substring(start, start + (length - off))
    var newWidth = context.measureText(substr).width
    if ((prevWidth + newWidth) <= width) {
      return { available: substr.length, width: newWidth }
    }
  }
  return { available: 0, width: 0 }
}

function indexOfAttribute (data, charIndex) {
  // find the first attribute at this character index
  for (var i = 0; i < data.length; i++) {
    var attrib = data[i]
    var text = attrib.text
    var length = text.length
    if (charIndex >= attrib.index && charIndex < attrib.index + length) {
      return i
    }
  }
  return -1
}

function composeBuffer (data) {
  var buffer = ''
  var previous = 0
  data.forEach(function (attrib) {
    var text = attrib.text
    buffer += text
    attrib.index = previous
    previous = attrib.index + text.length
  })
  return buffer
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

// simple
// data.forEach(function (attrib) {
//   var text = attrib.text
//   var lineHeight = attrib.lineHeight
//   var metrics = attrib.metrics

//   var x = cursorX
//   var y = cursorY + (maxHeight - lineHeight)
//   setFontParams(attrib)
//   context.fillStyle = attrib.fillStyle
//   context.fillText(text, x, y + lineHeight)

//   context.beginPath()
//   context.lineTo(x, y + lineHeight)
//   context.lineTo(x + metrics.width, y + lineHeight)
//   context.stroke()

//   cursorX += metrics.width
// })

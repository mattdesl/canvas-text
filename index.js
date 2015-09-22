var assign = require('object-assign')
var util = require('./lib/util')
var renderText = require('./lib/render')
var wordWrap = require('word-wrapper')
var dprop = require('dprop')

var baseSettings = {
  baseline: 'alphabetic',
  align: 'left',
  fillStyle: '#000',
  style: 'normal',
  variant: 'normal',
  weight: 'normal',
  family: 'sans-serif',
  size: 32
}

module.exports = createStyledText
function createStyledText (context, chunks, opts) {
  if (!context) {
    throw new TypeError('must specify a CanvasRenderingContext2D as first parameter')
  }

  var fullText = ''
  var maxLineWidth = 0
  var height = 0
  var data
  var lines = []
  var fonts = []
  var defaultOpts = assign({}, opts)

  var stlyedText = {
    render: render,
    update: update,
    layout: layout
  }

  // some read-only values
  Object.defineProperties(stlyedText, {
    lines: dprop(function () {
      return lines
    }),

    fonts: dprop(function () {
      return fonts
    }),

    width: dprop(function () {
      return maxLineWidth
    }),

    height: dprop(function () {
      return height
    }),
  })

  update(chunks, opts)
  return stlyedText

  function update (newChunks, newOpts) {
    opts = assign({}, baseSettings, defaultOpts, newOpts)

    // accept array or single element for string data
    if (!Array.isArray(newChunks)) {
      newChunks = [ newChunks || '' ]
    }

    chunks = newChunks

    // run an initial layout by default
    if (opts.layout !== false) layout()
  }

  function layout () {
    // copy data to avoid mutating user objects
    data = chunks.map(function (attrib) {
      if (typeof attrib === 'string') {
        attrib = { text: attrib }
      }

      attrib = assign({}, opts, attrib)

      attrib.text = attrib.text || ''
      attrib.font = getFontStyle(attrib, opts)

      // approximate line height from pixel size
      if (typeof attrib.lineHeight === 'undefined') {
        attrib.lineHeight = getLineHeight(attrib.size)
      }

      return attrib
    })

    fonts = data.map(function (attrib) {
      return attrib.font
    })

    fullText = util.composeBuffer(data)
    lines = wordWrap.lines(fullText, {
      width: opts.width,
      mode: opts.wordWrap,
      measure: measure
    })

    var lineSpacing = opts.lineSpacing || 0
    for (var i = lines.length - 1; i >= 0; i--) {
      var line = lines[i]
      line.height = util.getMaxAttrHeight(data, line.start, line.end)
      line.height += lineSpacing
    }

    maxLineWidth = lines.reduce(function (prev, line) {
      return Math.max(line.width, prev)
    }, 0)

    height = lines.reduce(function (prev, line) {
      return prev + line.height
    }, 0)
  }

  function render (originX, originY, renderFunc) {
    var cursorX = 0
    var cursorY = lines.length > 0 ? lines[0].height : 0

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i]
      var start = line.start
      var end = line.end
      var lineWidth = line.width
      var maxAttrHeight = line.height

      while (start < end) {
        // find next attribute chunk for this string char
        var attribIdx = util.indexOfAttribute(data, start)
        if (attribIdx === -1) {
          break
        }

        // for each attribute in this range ...
        var attrib = data[attribIdx]
        var length = util.getBlockLength(attrib, start, end)

        var text = fullText.substring(start, start + length)
        var lineHeight = attrib.lineHeight

        var x = originX + cursorX
        var y = originY + cursorY - lineHeight
        if (opts.align === 'right') {
          x += (maxLineWidth - lineWidth)
        } else if (opts.align === 'center') {
          x += (maxLineWidth - lineWidth) / 2
        }

        util.setFontParams(context, attrib)
        var textWidth = context.measureText(text).width
        cursorX += textWidth

        if (renderFunc) {
          renderFunc(context, text, x, y, textWidth, lineHeight, attrib, i)
        } else {
          renderText(context, text, x, y, textWidth, lineHeight, attrib, i)
        }

        // skip to next chunk
        start += Math.max(1, length)
      }
      cursorX = 0

      var next = lines[i + 1]
      if (next) {
        cursorY += next.height
      } else {
        cursorY += maxAttrHeight
      }
    }
  }

  function measure (text, start, end, width) {
    var availableGlyphs = 0
    var first = start
    var totalWidth = 0

    while (start < end) {
      // find next attribute chunk for this string char
      var attribIdx = util.indexOfAttribute(data, start)
      if (attribIdx === -1) {
        break
      }

      // for each attribute in this range ...
      var attrib = data[attribIdx]

      var result = util.computeAttributeGlyphs(context, fullText, totalWidth, attrib, start, end, width)
      availableGlyphs += result.available
      totalWidth += result.width

      // skip to next attribute
      start = attrib.index + attrib.text.length
    }

    return {
      width: totalWidth,
      start: first,
      end: first + availableGlyphs
    }
  }
}

function getFontStyle (opt, defaults) {
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

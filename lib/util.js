module.exports.getBlockLength = getBlockLength
module.exports.computeAttributeGlyphs = computeAttributeGlyphs
module.exports.setFontParams = setFontParams
module.exports.indexOfAttribute = indexOfAttribute
module.exports.composeBuffer = composeBuffer
module.exports.getMaxAttrHeight = getMaxAttrHeight

function setFontParams (context, opt) {
  context.textAlign = 'left'
  context.textBaseline = opt.baseline || 'alphabetic'
  context.font = opt.font
}

function getBlockLength (attrib, start, end) {
  var offset = Math.max(0, start - attrib.index)
  return Math.min(attrib.text.length - offset, end - start)
}

function computeAttributeGlyphs (context, fullText, prevWidth, attrib, start, end, width) {
  var length = getBlockLength(attrib, start, end)

  // determine how many chars in this chunk can be shown
  setFontParams(context, attrib)
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
    start = attrib.index + attrib.text.length
  }
  return maxAttrHeight
}

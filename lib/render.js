module.exports = renderText

function renderText (context, text, x, y, textWidth, lineHeight, attribute) {
  context.fillStyle = attribute.fillStyle
  context.fillText(text, x, y + lineHeight)
}

var createText = require('./')
var getContext = require('get-canvas-context')
var Promise = require('pinkie-promise')
var dashLine = require('ctx-dashed-line')
var assign = require('object-assign')
var debounce = require('debounce')
var lerp = require('lerp')
var ease = require('eases/sine-in-out')

var loop = require('canvas-loop')
var context = getContext('2d')
var canvas = context.canvas

context.fillStyle = 'white'
context.fillRect(0, 0, canvas.width, canvas.height)

document.body.appendChild(canvas)

var primary = {
  size: 42,
  fillStyle: 'hsl(100,0%,70%)',
  weight: 300
}

var chunks = [ 
  assign({ 
    text: ' Lorem ipsum dolor sit amet. ' 
  }, primary),
  {
    text: 'hello, world.',
    size: 60,
    fillStyle: 'hsl(0,20%,50%)',
    underline: true,
    strokeStyle: 'rgba(0,0,0,0.15)',
    weight: 300
  }, 
  assign({ 
    text: ' Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' 
  }, primary),
  {
    text: 'This text is drawn with canvas.',
    size: 32,
    fillStyle: 'hsl(0,0%,50%)',
    underline: false,
    strokeStyle: 'rgba(0,128,255,0.85)',
    weight: 700
  },
  assign({ 
    text: ' Sed sit amet diam molestie, tempus eros ut.' 
  }, primary)
]

var app = loop(canvas, {
  scale: window.devicePixelRatio
})

var padding = 50
var time = 0
var animate = 0
var text = createText(context, chunks, {
  lineSpacing: 15,
  family: '"Ubuntu", sans-serif',
})


var onResize = debounce(function () {
  text.update(chunks, { width: app.shape[0] - padding*2 })
}, 10)

app.on('tick', render)
  .on('resize', render)
  .on('resize', onResize)
  
onResize()

// try to use font loading to avoid FOUST
loadFonts(text.fonts).then(function () {
  app.start()
}, function (err) {
  throw err
})

function loadFonts (fonts) {
  if (document.fonts && document.fonts.load) {
    return Promise.all(fonts.map(function (font) {
      return document.fonts.load(font)
    }))
  } else {
    return new Promise(function (resolve) {
      setTimeout(resolve, 500)
    })
  } 
}

function render (dt) {
  time += dt / 1000
  animate = ease(Math.sin(time) * 0.5 + 0.5)

  context.save()
  context.scale(app.scale, app.scale)

  var shape = app.shape
  context.clearRect(0, 0, shape[0], shape[1])
  var x = padding
  var y = 25
  text.render(x, y, renderText)
  
  context.restore()
}

// we can tailor the chunk rendering to our application
// e.g. animations, fancy underlines, etc
function renderText (context, str, x, y, textWidth, lineHeight, attribute) {
  context.fillStyle = attribute.fillStyle

  if (attribute.underline) {
    context.beginPath()
    context.strokeStyle = attribute.strokeStyle || attribute.fillStyle
    context.lineWidth = lerp(0, 5, animate)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    
    var offY = y + 13
    dashLine(context,
        [ x, offY + lineHeight ], 
        [ x + textWidth, offY + lineHeight ],
        8)
    context.stroke()
  }
  
  context.fillText(str, x, y + lineHeight)
}

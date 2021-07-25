import { Bezier } from './lib/bezier.js'

// https://stackoverflow.com/questions/30277646/svg-convert-arcs-to-cubic-bezier

/*
Preprocessor:

Works on just Arcs and lines for now in order to do maze

Take all paths, convert to WrappedBezier
Take all lines, convert to WrappedLine
Create intersection method for both
Create split method for both
    Splits into {type: 'line', start: {x, y}} format

*/

let colours = [
  '#a6cee3',
  '#1f78b4',
  '#b2df8a',
  '#33a02c',
  '#fb9a99',
  '#e31a1c',
  '#fdbf6f',
  '#ff7f00',
  '#cab2d6',
  '#6a3d9a',
  '#ffff99',
  '#b15928',
]
let colour_i = 0

function wrapPathElements() {
  const mainSvg = document.getElementById('main-svg')
  let elements = [...mainSvg.getElementsByTagName('path')].flatMap((e) => {
    const b = Snap.path.toCubic(Snap(e))
    let beziers = []
    for (let i = 1; i < b.length; i++) {
      const wb = new WrappedBezier(
        ...[...b[i - 1].slice(-2), ...b[i].slice(1, b[i].length)]
      )
      wb.id = e.id
      beziers.push(wb)
    }
    return beziers
  })

  elements = elements.concat(
    [...mainSvg.getElementsByTagName('line')].map((e) => {
      const wl = new WrappedLine({
        p1: { x: +e.getAttribute('x1'), y: +e.getAttribute('y1') },
        p2: { x: +e.getAttribute('x2'), y: +e.getAttribute('y2') },
      })
      wl.id = e.id
      return wl
    })
  )

  return elements
}

function intersectAll(elements) {
  elements.forEach((e1, i1, elements) => {
    elements
      .filter((e2, i2) => i2 != i1)
      .forEach((e2) => {
        e1.intersectWith(e2)
      })
  })
}

function getColour() {
  const col = colours[colour_i]
  colour_i = (colour_i + 1) % colours.length
  return col
}

function drawAllElements(elements) {
  const svg_elem = document.getElementById('scratch-svg')
  elements.forEach((e) => {
    if (e instanceof WrappedBezier) {
      e.split().forEach((v) => {
        drawPath(v, getColour(), svg_elem)
      })
    } else if (e instanceof WrappedLine) {
      e.split().forEach((v) => {
        drawLine(v, getColour(), svg_elem)
      })
    }
  })
}

function drawPath(d, stroke, svg_elem) {
  const path_elem = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  )
  path_elem.setAttribute(
    'd',
    `M ${d[0].x},${d[0].y} C ${d[1].x},${d[1].y} ${d[2].x},${d[2].y} ${d[3].x},${d[3].y}`
  )
  path_elem.setAttribute('stroke', stroke)
  path_elem.setAttribute('fill', 'transparent')
  svg_elem.appendChild(path_elem)
}

function drawLine(vals, stroke, svg_elem) {
  const path_elem = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line'
  )
  path_elem.setAttribute('x1', vals.p1.x)
  path_elem.setAttribute('y1', vals.p1.y)
  path_elem.setAttribute('x2', vals.p2.x)
  path_elem.setAttribute('y2', vals.p2.y)

  path_elem.setAttribute('stroke', stroke)
  path_elem.setAttribute('fill', 'transparent')
  svg_elem.appendChild(path_elem)
}

window.onload = () => {
  debugger
  let elements = wrapPathElements()
  intersectAll(elements)
  //elements.forEach((e) => console.log(e.split()))
  drawAllElements(elements)
  debugger
}

function drawIntersection(x, y) {
  const svg_elem = document.getElementsByTagName('svg')[0]
  const circle_elem = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  )
  circle_elem.setAttribute('cx', x)
  circle_elem.setAttribute('cy', y)
  circle_elem.setAttribute('r', 10)
  svg_elem.appendChild(circle_elem)
}

/* ---------------------------------------------------- */
/*                Element Wrappers                      */
/* ---------------------------------------------------- */

class Wrapper {
  intersections = [0, 1]

  addIntersection(t) {
    // under this distance (in viewbox units) two intersections are
    // considered the same
    const dist_threshold = 1

    const new_pos = this.getPosFromT(t)

    const distances = this.intersections.map((i) => {
      const i_pos = this.getPosFromT(i)
      const diff_vec = {
        x: new_pos.x - i_pos.x,
        y: new_pos.y - i_pos.y,
      }
      return vectorLength(diff_vec)
    })

    if (Math.min(...distances) >= dist_threshold) {
      this.intersections.push(t)
    }

    /*
    const epsilon = 0.00001
    if (
      // our t value is not close to 0, 1 or already in our array
      t > epsilon &&
      t < 1 - epsilon &&
      this.intersections.findIndex((x) => Math.abs(x - t) < epsilon) == -1
    ) {
      this.intersections.push(t)
    }*/
  }
}

class WrappedLine extends Wrapper {
  line = undefined

  constructor(vals) {
    /*
    Line defined as:
    {p1: {x: x1, y: y1}, p2: {x: x2, y: y2}}
    */
    super()
    this.line = vals
  }

  intersectWith(e) {
    //if (this.id == 'line_1' && e.id == 'path_19') debugger
    let t_vals = []
    if (e instanceof WrappedBezier) {
      t_vals = e.bezier
        //.intersects(this.line)
        .intersects(this.line)
        .map((t) => this.getTfromPos(e.bezier.get(t)).t)
      //.forEach((t) => this.addIntersection(t))
    } else if (e instanceof WrappedLine) {
      t_vals = t_vals.concat(this.intersectLines(this, e))
    }

    if (t_vals.length > 0 && this.id == 'line_7') debugger
    t_vals.forEach((t) => this.addIntersection(t))
  }

  intersectLines(l1, l2) {
    // returns t, x, y on l1 where l2 intersects
    const l2_params = l2.getLineParams()
    const l1_params = l1.getLineParams()

    // if lines are parallel they don't intersect
    if (l2_params.a == l1_params.a) return

    const x = (l2_params.b - l1_params.b) / (l1_params.a - l2_params.a)
    const y = l1_params.a * x + l1_params.b

    const l1_t = l1.getTfromPos({ x, y }).t
    const l2_t = l2.getTfromPos({ x, y }).t

    if (l1_t >= 0 && l1_t <= 1 && l2_t >= 0 && l2_t <= 1) {
      return [l1_t]
    } else {
      return []
    }
  }

  split() {
    // returns an array of Beziers corresponding to the curve split over
    // [0, t1], [t1,t2], [t2,t3], ... , [tn,1]
    this.intersections.sort()
    //const t_vals = [0, ...this.intersections, 1]
    let points = []
    for (let i = 0; i < this.intersections.length - 1; i++) {
      const new_point = {
        p1: this.getPosFromT(this.intersections[i]),
        p2: this.getPosFromT(this.intersections[i + 1]),
      }
      points.push(new_point)
    }

    return points
  }

  getLineParams() {
    const vec = this.getLineAsVector()
    const a = vec.y / vec.x
    const b = this.line.p1.y - a * this.line.p1.x
    return {
      a: a,
      b: b,
    }
  }

  getLineAsVector() {
    return {
      x: this.line.p2.x - this.line.p1.x,
      y: this.line.p2.y - this.line.p1.y,
    }
  }

  /*getTfromPosOld(pos) {
    const vec = this.getLineAsVector()

    const pos_origin = {
      x: pos.x - this.line.p1.x,
      y: pos.y - this.line.p1.y,
    }

    if (pos_origin.x == 0 && pos_origin.y == 0) {
      return 0
    } else {
      const theta_vec = Math.atan(vec.y / vec.x)
      const h_vec = vec.y / Math.sin(theta_vec)

      const theta_pos = Math.atan(pos_origin.y / pos_origin.x)
      const h_pos = pos_origin.y / Math.sin(theta_pos)

      return h_pos / h_vec
    }
  }*/

  getTfromPos(pos) {
    /*
    Gets the t value corresponding to point pos on vector vec.
    It is assumed that pos lies on vec.
    */
    const vec = this.getLineAsVector()

    const pos_vec = {
      x: pos.x - this.line.p1.x,
      y: pos.y - this.line.p1.y,
    }

    const proj_pos = vectorProject(pos_vec, vec)
    //const t = vectorLength(proj_pos) / vectorLength(vec)

    // Since pos_vec lies on the line described by vec, we can calculate t
    // from the x or the y coordinate alone
    const t = vec.x == 0 ? proj_pos.y / vec.y : proj_pos.x / vec.x

    return {
      t: t,
      x: proj_pos.x + this.line.p1.x,
      y: proj_pos.y + this.line.p1.y,
    }
  }

  getPosFromT(t) {
    /*
    Gets a point along a vector vec corresponding to t, where t E [0,1]
    */
    const vec = this.getLineAsVector()
    const theta = Math.atan(vec.y / vec.x)
    const h =
      Math.sin(theta) == 0 ? vec.x / Math.cos(theta) : vec.y / Math.sin(theta)
    const h_pos = h * t
    const vec_pos = {
      x: Math.cos(theta) * h_pos,
      y: Math.sin(theta) * h_pos,
    }
    return {
      t: t,
      x: vec_pos.x + this.line.p1.x,
      y: vec_pos.y + this.line.p1.y,
    }
  }
}

class WrappedBezier extends Wrapper {
  bezier = undefined

  constructor(...vals) {
    super()
    this.bezier = new Bezier(vals)
  }

  intersectWith(e) {
    // Adds intersections between this curve and b
    if (this.id == 'bigarc' && e.id == 'arcline') debugger
    const dist_epsilon = 5
    let t_vals
    if (e instanceof WrappedBezier) {
      // standard intersections on curve
      t_vals = this.bezier.intersects(e.bezier).map((t) => +t.split('/')[0])

      // check if start or end point of other curve is very close
      const sp = this.bezier.project(e.bezier.points[0])
      if (sp.d < dist_epsilon) {
        t_vals.push(sp.t)
      }
      const ep = this.bezier.project(e.bezier.points[3])
      if (ep.d < dist_epsilon) {
        t_vals.push(ep.t)
      }
    } else if (e instanceof WrappedLine) {
      t_vals = this.bezier.intersects(e.line)
      //t_vals = this.bezier.intersects(e.line))

      // check if start or end point of other curve is very close
      const sp = this.bezier.project(e.line.p1)
      if (sp.d < dist_epsilon) {
        t_vals.push(sp.t)
      }
      const ep = this.bezier.project(e.line.p2)
      if (ep.d < dist_epsilon) {
        t_vals.push(ep.t)
      }
    }
    return t_vals.forEach((t) => this.addIntersection(t))
  }

  split() {
    // returns an array of Beziers corresponding to the curve split over
    // [0, t1], [t1,t2], [t2,t3], ... , [tn,1]
    //if (this.id == 'bigarc') debugger
    this.intersections.sort()
    //const t_vals = [0, ...this.intersections, 1]
    let points = []
    for (let i = 0; i < this.intersections.length - 1; i++) {
      points.push(
        this.bezier.split(this.intersections[i], this.intersections[i + 1])
          .points
      )
    }
    return points
  }

  getPosFromT(t) {
    return this.bezier.get(t)
  }

  asSnap() {
    const d = this.bezier.points
    return new Snap.parse(
      `M ${d[0].x},${d[0].y} C ${d[1].x},${d[1].y} ${d[2].x},${d[2].y} ${d[3].x},${d[3].y}`
    )
  }
}

// Vector functions
function dotProduct(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y
}

// https://en.wikipedia.org/wiki/Vector_projection
// project a onto b
function vectorProject(a, b) {
  const scalar = dotProduct(a, b) / dotProduct(b, b)
  let v = Object.assign({}, b)
  v.x = scalar * v.x
  v.y = scalar * v.y
  return v
}

function vectorLength(v) {
  return Math.sqrt(dotProduct(v, v))
}

/* OLD STUFF */
const old_onload = () => {
  debugger
  let snap_elems = [...document.getElementsByTagName('path')].map((e) => {
    return Snap(e)
  })

  const mainSvg = document.getElementById('main-svg')
  let beziers = [...mainSvg.getElementsByTagName('path')].flatMap((e) => {
    const b = Snap.path.toCubic(Snap(e))
    let beziers_ = []
    //let path_vals = []
    for (let i = 1; i < b.length; i++) {
      /*path_strings.push(
        `M ${b[i - 1].slice(-2).join(' ')} C ${b[i]
          .slice(1, b[i].length)
          .join(' ')}`
      )*/
      //path_vals.push([...b[i - 1].slice(-2), ...b[i].slice(1, b[i].length)])
      beziers_.push(
        new WrappedBezier(
          ...[...b[i - 1].slice(-2), ...b[i].slice(1, b[i].length)]
        )
      )
    }
    return beziers_
  })

  beziers.forEach((b, i) => {
    console.log(i, ': ', colours[colour_i])
    drawPath(b.bezier.points, colours[colour_i])
    colour_i = (colour_i + 1) % colours.length
  })

  beziers.forEach((b1, i1, beziers) => {
    beziers
      .filter((b2, i2) => i2 != i1)
      .forEach((b2) => {
        b1.intersectWith(b2)
      })
  })

  let points = beziers.flatMap((b) => b.split())

  points.forEach((p) => {
    drawPath(p, colours[colour_i])
    colour_i = (colour_i + 1) % colours.length
  })

  /*let intersections = snap_elems.flatMap((e1) => {
    return snap_elems
      .filter((e2) => !(e2 === e1))
      .flatMap((e2) => {
        const i = Snap.path.intersection(e1, e2)
        return i.map((v) => {
          return { x: v.x, y: v.y }
        })
      })
  })

  let intersections_deduped = []
  intersections.forEach((i) => {
    if (
      intersections_deduped.findIndex((v) => v.x == i.x && v.y == i.y) == -1
    ) {
      intersections_deduped.push(i)
    }
  })

  intersections_deduped.forEach((v) => {
    drawIntersection(v.x, v.y)
  })*/
}

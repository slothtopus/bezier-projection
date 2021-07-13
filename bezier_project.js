let path_def = [
  {
    start: [100, 100],
    control1: [900, 500],
    control2: [100, 900],
    end: [900, 900],
  },
  {
    start: [900, 900],
    control1: [900, 0],
    control2: [400, 400],
    end: [600, 50],
  },
]

let mouse_x
let mouse_y
let scaleFactor

let t = 0
const n_segments = 5

function drawLineApproximation() {
  for (let s = 0; s < n_segments; s++) {
    const coords = getLineForSegment(s, n_segments, path_def[0])
    drawLine(coords[0], coords[1])
  }
}

function drawLine(start, end) {
  const svg_elem = document.getElementsByTagName('svg')[0]
  const line_elem = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line'
  )
  line_elem.setAttribute('x1', start.x)
  line_elem.setAttribute('y1', start.y)
  line_elem.setAttribute('x2', end.x)
  line_elem.setAttribute('y2', end.y)
  line_elem.setAttribute('stroke', 'green')
  svg_elem.appendChild(line_elem)
}

function mousedownHandler(mousemoveHandler, event) {
  mouse_x = event.clientX
  mouse_y = event.clientY

  const el = event.target
  el.classList.add('selected')
  document.body.style.cursor = 'pointer'

  function mouseupHandler(event) {
    el.classList.remove('selected')
    document.body.style.cursor = null
    document.removeEventListener('mousemove', mousemoveHandler)
    document.removeEventListener('mouseup', mouseupHandler)
  }

  document.addEventListener('mousemove', mousemoveHandler)
  document.addEventListener('mouseup', mouseupHandler)
}

function movePointMousemove(event) {
  const moveVector = {
    x: (event.clientX - mouse_x) * scaleFactor,
    y: (event.clientY - mouse_y) * scaleFactor,
  }

  t = move(moveVector, t, path_def[0])
  console.log(t)
  const new_pos = cubicBezier(t, path_def[0])
  updateMovePoint(new_pos[0], new_pos[1])

  mouse_x = event.clientX
  mouse_y = event.clientY
}

function updateMovePoint(x, y) {
  const movePoint = document.getElementById('movePoint')
  movePoint.setAttribute('cx', x)
  movePoint.setAttribute('cy', y)
}

function onResize() {
  const svgRect = document.querySelector('svg').getBoundingClientRect()
  scaleFactor = 1000 / Math.min(svgRect.width, svgRect.height)
}

window.onload = () => {
  onResize()
  window.addEventListener('resize', onResize)
  document
    .getElementById('movePoint')
    .addEventListener(
      'mousedown',
      mousedownHandler.bind(this, movePointMousemove)
    )

  drawLineApproximation()
}

/*
Helper functions

segmentBounds(s, step_size)

Gets the segment start and end t vals from segment num s

getSegmentFromT(t, step_size)
Get the segment num from t

getLineFromT(t, step_size, line_def)
Gets the line start and end coords from t and step size
*/

function cubicBezier(t, w) {
  const t2 = t * t
  const t3 = t2 * t
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  return [
    w.start[0] * mt3 +
      3 * w.control1[0] * mt2 * t +
      3 * w.control2[0] * mt * t2 +
      w.end[0] * t3,
    w.start[1] * mt3 +
      3 * w.control1[1] * mt2 * t +
      3 * w.control2[1] * mt * t2 +
      w.end[1] * t3,
  ]
}

function move(v, t_, path_def) {
  const epsilon = 0.000001

  const lines = getAllLinesForT(t_, n_segments, path_def)
  console.log('getAllLinesForT: ', lines)

  const all_moves = lines.map((x) => {
    const line_vec = lineToVector(x.line)
    const t_unbounded = rescale(t_, x.t_bounds, [0, 1])
    const moved = traverseVector(line_vec, t_unbounded, v)
    const t_new = moved.t
    const v_new = moved.new_move_vec
    const t_new_bounded = rescale(t_new, [0, 1], x.t_bounds)
    const moved_distance = vectorLength({ x: v_new.x - v.x, y: v_new.y - v.y })
    return {
      ...x,
      t_new: t_new_bounded,
      v_new: v_new,
      distance: moved_distance,
    }
  })

  const longest_move_i = all_moves.findIndex(
    (x) => x.distance == Math.max(...all_moves.map((y) => y.distance))
  )

  const chosen_move = all_moves[longest_move_i]

  if (chosen_move.distance < epsilon) {
    return chosen_move.t_new
  } else {
    return move(chosen_move.v_new, chosen_move.t_new, path_def)
  }
}

function segmentBoundsForS(s, n_segments) {
  // Return start and end t vals for segment s
  return [s * (1 / n_segments), (s + 1) * (1 / n_segments)]
}

/*function segmentBoundsForT(t, n_segments) {
  // Return start and end t vals for the segment in which t falls
  return segmentBoundsForS(getSegmentFromT(t, n_segments), n_segments)
}*/

/*function getSegmentFromT(t, n_segments) {
  // Return the segment in which t falls
  return Math.floor(t / (1 / n_segments))
}*/

function rescale(t_, current_bounds, new_bounds) {
  // Rescale a t lying in current_bounds to new_bounds
  t_ = Math.min(Math.max(t_, current_bounds[0]), current_bounds[1])
  const t_norm =
    (t_ - current_bounds[0]) / (current_bounds[1] - current_bounds[0])
  return new_bounds[0] + t_norm * (new_bounds[1] - new_bounds[0])
}

function getLineForSegment(s, n_segments, line_def) {
  const t_bounds = segmentBoundsForS(s, n_segments)
  const start_point = cubicBezier(t_bounds[0], line_def)
  const end_point = cubicBezier(t_bounds[1], line_def)

  return [
    { x: start_point[0], y: start_point[1] },
    { x: end_point[0], y: end_point[1] },
  ]
}

/*function getLineForT(t, n_segments, line_def) {
  return getLineForSegment(getSegmentFromT(t, n_segments), n_segments, line_def)
}*/

function getAllLinesForT(t, n_segments, path_def) {
  /*
  Returns all lines that t falls on
  If t falls in the middle of a segment, this is just the line for the current segment
  If t falls on or near the start of a segment, this is the current segment and previous segment (if this exists)
  If t falls near the end of a segment, this is the current segment and next segment (if this exists)
  */
  const epsilon = 0.000001

  const seg_pos = t / (1 / n_segments)
  let s = Math.floor(seg_pos)
  s = Math.min(Math.max(s, 0), n_segments - 1)

  const lower_seg_boundary = Math.floor(seg_pos)
  const upper_seg_boundary = Math.ceil(seg_pos)

  const near_lower_boundary = Math.abs(seg_pos - lower_seg_boundary) < epsilon
  const near_upper_boundary =
    seg_pos != upper_seg_boundary &&
    Math.abs(seg_pos - upper_seg_boundary) < epsilon

  const t_bounds = segmentBoundsForS(s, n_segments)
  console.log('t_bounds: ', t_bounds)

  if (
    near_lower_boundary &&
    lower_seg_boundary != 0 &&
    lower_seg_boundary != n_segments
  ) {
    const t_bounds_prev = segmentBoundsForS(s - 1, n_segments)
    return [
      {
        t_bounds: t_bounds_prev,
        t: t_bounds_prev[1],
        line: lineFromTbounds(t_bounds_prev, path_def),
      },
      {
        t_bounds: t_bounds,
        t: t_bounds[0],
        line: lineFromTbounds(t_bounds, path_def),
      },
    ]
  } else if (near_upper_boundary && upper_seg_boundary != n_segments) {
    const t_bounds_next = segmentBoundsForS(s + 1, n_segments)
    return [
      {
        t_bounds: t_bounds_next,
        t: t_bounds_next[0],
        line: lineFromTbounds(t_bounds_next, path_def),
      },
      {
        t_bounds: t_bounds,
        t: t_bounds[1],
        line: lineFromTbounds(t_bounds, path_def),
      },
    ]
  } else {
    return [
      {
        t_bounds: t_bounds,
        t: t,
        line: lineFromTbounds(t_bounds, path_def),
      },
    ]
  }
}

function lineFromTbounds(t_bounds, path_def) {
  const start_point = cubicBezier(t_bounds[0], path_def)
  const end_point = cubicBezier(t_bounds[1], path_def)
  return [
    { x: start_point[0], y: start_point[1] },
    { x: end_point[0], y: end_point[1] },
  ]
}

function lineToVector(line) {
  return {
    x: line[1].x - line[0].x,
    y: line[1].y - line[0].y,
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

function traverseVector(vec, start_t, move_vec) {
  /*
  Moves along vector vec as much as possible according to move_vec starting at start_t.
  We return the new t position and also how much of move_vec hasn't been 'used up' by the 
  move.

  vec = Vector along which we will be moving
  start_t = Position along vec: 0 = start, 1 = end
  move_vec = Movement vector

  returns {
    t: new t position along vec after move
    new_move_vec: how much of move_vec remains to be used up
  }
  */

  const move_vec_proj = vectorProject(move_vec, vec)
  const vec_pos = getVectorPos(vec, start_t)

  let new_vec_pos = {
    x: vec_pos.x + move_vec_proj.x,
    y: vec_pos.y + move_vec_proj.y,
  }

  new_vec_pos = clipToVectorBounds(new_vec_pos, vec)
  const end_t = getVectorT(vec, new_vec_pos)

  const moved_vec = {
    x: new_vec_pos.x - vec_pos.x,
    y: new_vec_pos.y - vec_pos.y,
  }

  const remaining_move_pct =
    vectorLength(move_vec_proj) == 0
      ? 1
      : 1 - vectorLength(moved_vec) / vectorLength(move_vec_proj)

  const new_move_vec = {
    x: move_vec.x * remaining_move_pct,
    y: move_vec.y * remaining_move_pct,
  }

  return {
    t: end_t,
    new_move_vec: new_move_vec,
  }
}

function getVectorPos(vec, t) {
  /*
  Gets a point along a vector vec corresponding to t, where t E [0,1]
  */
  const theta = Math.atan(vec.y / vec.x)
  const h = vec.y / Math.sin(theta)
  const h_pos = h * t
  const vec_pos = {
    x: Math.cos(theta) * h_pos,
    y: Math.sin(theta) * h_pos,
  }
  return vec_pos
}

function getVectorT(vec, pos) {
  /*
  Gets the t value corresponding to point pos on vector vec.
  It is assumed that pos lies on vec.
  */
  if (pos.x == 0 || pos.y == 0) {
    return 0
  } else {
    const theta_vec = Math.atan(vec.y / vec.x)
    const h_vec = vec.y / Math.sin(theta_vec)

    const theta_pos = Math.atan(pos.y / pos.x)
    const h_pos = pos.y / Math.sin(theta_pos)

    return h_pos / h_vec
  }
}

function clipToVectorBounds(clip_vec, bounds_vec) {
  /*
  Clips clip_vec to the bounds of bounds_vec
  */
  const max_x = Math.max(0, bounds_vec.x)
  const min_x = Math.min(0, bounds_vec.x)

  const max_y = Math.max(0, bounds_vec.y)
  const min_y = Math.min(0, bounds_vec.y)

  return {
    x: Math.min(Math.max(min_x, clip_vec.x), max_x),
    y: Math.min(Math.max(min_y, clip_vec.y), max_y),
  }
}

function vectorLength(v) {
  return Math.sqrt(dotProduct(v, v))
}
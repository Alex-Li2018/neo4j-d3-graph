export function merge(target, source) {
    Object.keys(source).forEach((property) => {
        target[property] = source[property]
    })
}

export function colors() {
    return [
        '#68bdf6', // light blue
        '#6dce9e', // green #1
        '#faafc2', // light pink
        '#f2baf6', // purple
        '#ff928c', // light red
        '#fcea7e', // light yellow
        '#ffc766', // light orange
        '#405f9e', // navy blue
        '#a5abb6', // dark gray
        '#78cecb', // green #2,
        '#b88cbb', // dark purple
        '#ced2d9', // light gray
        '#e84646', // dark red
        '#fa5f86', // dark pink
        '#ffab1a', // dark orange
        '#fcda19', // dark yellow
        '#797b80', // black
        '#c9d96f', // pistacchio
        '#47991f', // green #3
        '#70edee', // turquoise
        '#ff75ea', // pink
    ]
}

export function contains(array, id) {
    const filter = array.filter(elem => elem.id === id)

    return filter.length > 0
}

// 假设有一个点 (x, y) Math.atan2(x, y) 计算该点与x轴之间的弧度
// Math.atan2(x, y) * 180 / Math.PI 为角度
export function rotation(source, target) {
    return Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI
}

// eslint-disable-next-line class-methods-use-this
export function rotate(cx, cy, x, y, angle) {
    // 度转弧度
    const radians = (Math.PI / 180) * angle
    // 余弦 Math.cos 算的 x 与Math.sin 算的 y 使用的是弧度
    const cos = Math.cos(radians)
    // 正弦
    const sin = Math.sin(radians)
    const nx = (cos * (x - cx)) + (sin * (y - cy)) + cx
    const ny = (cos * (y - cy)) - (sin * (x - cx)) + cy

    return { x: nx, y: ny }
}

// 旋转点
export function rotatePoint(c, p, angle) {
    return rotate(c.x, c.y, p.x, p.y, angle)
}

// eslint-disable-next-line class-methods-use-this
export function unitaryVector(source, target, newLength) {
    /**
     x的平方 与 y的平方 的平方根 除以 Math.sqrt(newLength || 1)
     距离相当于缩小了对应的倍数

     (target.x - source.x) / length 单位向量

     newLength为1的时候 计算的是 在直角坐标系中 target点到source点的距离
     */
    // eslint-disable-next-line no-restricted-properties
    const length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) / Math.sqrt(newLength || 1)

    return {
        x: (target.x - source.x) / length,
        y: (target.y - source.y) / length,
    }
}

export function unitaryNormalVector(source, target, newLength) {
    const center = { x: 0, y: 0 }
    const vector = unitaryVector(source, target, newLength)

    return rotatePoint(center, vector, 90)
}

// 已知角度angle以及开始点(x1,y1)结束点(x2, y2)在两点之间画一个固定角度的弧线,求半径
export function getArcRadius(angle, target, source) {
    // eslint-disable-next-line no-restricted-properties
    const length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2))
    const half = length / 2

    const radian = Math.PI / 180 * angle

    return half / Math.cos(radian)
}
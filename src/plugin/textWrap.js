export default class TextWrap {
    constructor() {

    }

    // 超出两行省略
    wrapEllipsisText(textElement, text, maxWidth, lineHeight, unit = 'em') {
        const words = text ? text.split('').reverse() : []
        let word
        const line = []
        let lineNumber = 0
        const totalLine = []

        // eslint-disable-next-line no-cond-assign
        while (word = words.pop()) {
            line.push(word)
            const texttmp = line.join(' ')

            if (this.measureWidth()(texttmp) > maxWidth) {
                line.pop()
                lineNumber += 1
            }
            totalLine.push(word)
            if (lineNumber === 3) {
                totalLine.splice(-1, 2, '...')
                break
            }
        }

        const lineTwo = totalLine.join('')
        this.wrapText(textElement, lineTwo, maxWidth, lineHeight, unit, lineNumber)
    }

    calcTextLine(text, maxWidth) {
        const words = text ? text.split('').reverse() : []
        let word
        const line = []
        let lineNumber = 0

        // eslint-disable-next-line no-cond-assign
        while (word = words.pop()) {
            line.push(word)
            const texttmp = line.join(' ')

            if (this.measureWidth()(texttmp) > maxWidth) {
                line.pop()
                lineNumber += 1
            }
        }

        return lineNumber
    }

    wrapText(textElement, text, maxWidth, lineHeight, unit = 'em', totalLine) {
        // word parameters
        const words = text.split('').reverse()
        let word
        let line = []
        let lineNumber = 0

        // styling parameters
        const x = textElement.attr('x')
        const y = totalLine > 1 ? '0px' : textElement.attr('y')
        if (!lineHeight) lineHeight = 1.1

        // clear text_elements text
        textElement.text(null)

        // append first tspan element (to fill as we build the lines)
        let tspan = textElement.append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dy', 0)

        // loop through all words and make new lines when we exceed our maxWidth
        // eslint-disable-next-line no-cond-assign
        while (word = words.pop()) {
            line.push(word)
            tspan.text(line.join(''))
            if (this.measureWidth()(tspan.text()) > maxWidth) {
                line.pop()
                tspan.text(line.join(' '))
                line = [word]
                tspan = textElement.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dy', `${++lineNumber * lineHeight}${unit}`)
                    .text(word)
            }
        }
    }

    measureWidth() {
        const context = document.createElement('canvas').getContext('2d')
        return text => context.measureText(text).width
    }
}
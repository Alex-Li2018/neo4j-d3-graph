export default class ToolTips {
    constructor() {
        this.tooltips = d3.select('body')
            .append('div')
            .attr('class', 'svg-tooltip')
            .attr('id', 'svg-tooltip')
            .style('visibility', 'hidden')
            .style('color', '#fff')
            .style('display', 'block')
            .style('font-size', '11px')
            .style('max-width', '320px')
            .style('padding', '.2rem .4rem')
            .style('position', 'absolute')
            .style('text-overflow', 'ellipsis')
            .style('word-wrap', 'break-word')
            .style('line-height', '15px')
            .style('z-index', 300)
            .style('background', 'rgba(69, 77, 93, .9)')
            .style('border-radius', '.1rem')
            .style('left', '0px')
            .style('top', '0px')
    }

    showToolTips(text) {
        this.tooltips.style('visibility', 'visible')
            .text(text)
    }

    moveToolTips(top, left) {
        this.tooltips.style('top', top)
            .style('left', left)
    }

    hideToolTips() {
        this.tooltips.style('visibility', 'hidden')
    }

    destroyToolsTips() {
        d3.select('#svg-tooltip').remove()
    }
}
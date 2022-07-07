// 向svg中加入nodes

/**
 nodes的dom结构形如:
 <g class="nodes">
    <g class="node">
        <circle class="ring">
        </circle>
        <circle class="outline">
        </circle>
        // 可以是文本节点
        <text>{{ node name }}</text>
        // 也可以是图片节点
        <img />
        // 也可以是iconfont
        <text>
        <g>
            <path></path>
            <g><icon /></g>
        </g>
        <g>
            <path></path>
            <g><icon /></g>
        </g>
    </g>
 </g>
 */
 export default class Nodes {
    constructor() {

    }

    /**
   * 更新视图里的nodes节点
   * @param {Array} n 节点
   * @param {Boolean} isAttr 是否是属性节点
   * @param {Boolean} isHide 是否只使用当前传入的节点,还是将当前节点与视图上已有的节点合并在一起渲染
   */
    updateNodes(n, isAttr = false, isHide = false) {
        if (!isHide) {
            Array.prototype.push.apply(this.nodes, n)
        } else {
            this.nodes = Array.prototype.concat.apply([], n)
        }

        // 将nodes下面的node数据
        this.node = this.svgNodes
            .selectAll('.node')
            .data(this.nodes, d => d.id)
        const nodeEnter = this.appendNodeToGraph(isAttr)

        // 合并update与enter的数据集
        nodeEnter.merge(this.node)
        this.node.exit().remove()
        this.node = this.svgNodes.selectAll('.node')
    }

    appendNodeToGraph(isAttr = false) {
        // 链接g模块
        const n = this.appendNode()
        // ring为外层hover的轮廓
        this.appendRingToNode(n)
        // outline是圆心
        this.appendOutlineToNode(n)
        // 添加文本或者img
        this.appendTextToNode(n)

        if (!isAttr) {
            // 添加点击之后的菜单栏
            this.options.showNodePlate && this.appendMenuToNode(n)
        }

        // 显示图例
        this.formatLabelLegend()

        return n
    }

    appendNode() {
        // enter: data数据没有绑定到与dom的元素合集
        const self = this
        let ishowToolTip = false

        return this.node.enter()
            .append('g')
            .attr('class', (d) => {
                let highlight
                let i
                let classes = 'node'

                if (this.options.highlight) {
                    for (i = 0; i < this.options.highlight.length; i++) {
                        highlight = this.options.highlight[i]

                        if (Number(d.id) === Number(highlight.id)) {
                            classes += ' node-highlighted'
                            classes += (highlight.class || '')
                            break
                        }
                    }
                }

                return classes
            })
            .each((d) => {
                const { highlight } = self.options
                // 只有一个
                if (highlight.length === 1 && highlight.includes(d.id)) {
                    d.fx = self.svg.node().parentElement.parentElement.clientWidth / 2
                    d.fy = self.svg.node().parentElement.parentElement.clientHeight / 2
                }
            })
            .on('click', function (e, d) {
                const did = d.id
                // 点击的时候固定点
                self.fixNodes(d)
                if (d.labels[0] === '属性') {
                    d.nodeType === 'iconfont' && typeof self.options.onIconfontClick === 'function' && self.options.onIconfontClick(d)
                    return
                }


                // 显示当前的操作栏
                d3.select(this)
                    .selectAll('.context-menu-item')

                // 先清楚所有的操作栏
                d3.selectAll('.context-menu-item')
                    .each(function () {
                        // eslint-disable-next-line no-shadow
                        d3.select(this).classed('context-show', function (d) {
                            if (d.id === did) {
                                return !d3.select(this)
                                    .attr('class')
                                    .includes('context-show')
                            }
                            return false
                        })
                    })

                if (typeof self.options.onNodeClick === 'function') {
                    self.options.onNodeClick(e, d, d3)
                }

                e.stopPropagation()
            })
            .on('dblclick', (e, d) => {
                self.fixNodes(d)

                if (typeof self.options.onNodeDoubleClick === 'function') {
                    self.options.onNodeDoubleClick(e, d, d3)
                }

                // 先清楚所有的操作栏
                d3.selectAll('.context-menu-item')
                    .each(function () {
                        d3.select(this).classed('context-show', false)
                    })

                

                if (!d.properties4show || !d.properties4show.length) return

                // 展示 隐藏属性值
                const ishowAttr = self.nodes.filter(
                    item => item.labels.includes('属性')
                          && item.properties.$_parent_id === d.id,
                )

                if (ishowAttr && ishowAttr.length) {
                    self.hidePropertiesNodeAndRelationShips(d)
                } else {
                    self.showPropertiesNodeAndRelationShips(d)
                }

                if (typeof self.options.onMenuNodeClick === 'function') {
                    self.options.onMenuNodeClick({
                        name: 'AttrLink',
                        status: !!ishowAttr.length,
                        metaData: d,
                    })
                }

                e.stopPropagation()
            })
            .on('mouseenter', (e, d) => {
                if (typeof self.options.onNodeMouseEnter === 'function') {
                    self.options.onNodeMouseEnter(e, d, d3)
                }

                e.stopPropagation()
            })
            .on('mouseover', (e, d) => {
                // 超出省略的处理tooltip,如果是nodeType的类型为iconfont,那么不超出显示
                if (d.nodeType !== 'iconfont') {
                    const text = d.properties.name
                    ishowToolTip = self.calcTextLine(text, self.options.nodeRadius * 2 - 6) > 1
                    if (!ishowToolTip) return
                    self.showToolTips(text)
                }


                if (typeof self.options.onNodeMouseEnter === 'function') {
                    self.options.onNodeMouseover(e, d, d3)
                }

                e.stopPropagation()
            })
            .on('mousemove', (e) => {
                if (!ishowToolTip) return

                const pageX = `${e.pageX + 10}px`
                const pageY = `${e.pageY - 10}px`
                self.moveToolTips(pageY, pageX)

                e.stopPropagation()
            })
            .on('mouseleave', (e, d) => {
                if (typeof self.options.onNodeMouseLeave === 'function') {
                    self.options.onNodeMouseLeave(e, d)
                }

                e.stopPropagation()
            })
            .on('mouseout', (e, d) => {
                // 移出隐藏tooltip
                self.hideToolTips()

                if (typeof self.options.onNodeMouseOut === 'function') {
                    self.options.onNodeMouseOut(e, d, d3)
                }

                e.stopPropagation()
            })
            // 给每个元素装上drag事件
            .call(
                d3.drag()
                    .on('start', this.dragStarted.bind(this))
                    .on('drag', this.dragged.bind(this))
                    .on('end', this.dragEnded.bind(this)),
            )
    }

    appendRingToNode(node) {
        return node.append('circle')
            .attr('class', 'ring')
            .attr('r', this.options.nodeRadius * 1.2)
    }

    appendOutlineToNode(node) {
        return node.append('circle')
            .attr('class', 'outline')
            .attr('r', this.options.nodeRadius)
            .style('fill', d => (this.options.nodeOutlineFillColor
                ? this.options.nodeOutlineFillColor : this.class2color(d.labels[0])))
            .style('stroke', d => (
                this.options.nodeOutlineFillColor
                    ? this.class2darkenColor(this.options.nodeOutlineFillColor)
                    : this.class2darkenColor(d.labels[0])))
    }

    appendTextToNode(node) {
        const self = this

        return node.append('text')
            .attr('fill', '#ffffff')
            .attr('font-size', '10px')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .attr('y', '5px')
            .attr('x', '0px')
            .each(function (d) {
                if (d.nodeType === 'iconfont') {
                    const name = `${d.properties.name}`
                    d3.select(this)
                        .attr('class', 'iconfontKG iconfont-kg-neo4j3d')
                        .attr('font-size', '20px')
                        .attr('y', '8px')
                        .html(() => `&#x${self.options.iconMap[name]}`)
                } else {
                    // 防御性编程: 防止属性名不是字符串而是number
                    const name = `${d.properties.name}`
                    self.wrapEllipsisText(d3.select(this), name, self.options.nodeRadius * 2 - 12)
                }
            })
    }

    // 节点的关系变展示
    tickNodes() {
        if (this.node) {
            this.node.attr('transform', d => `translate(${d.x}, ${d.y})`)
        }
    }

    // 颜色的处理
    class2darkenColor(cls) {
        return d3.rgb(this.class2color(cls)).darker(1)
    }

    class2color(cls) {
        let color = this.classes2colors[cls]

        if (!color) {
            color = this.options.colors[this.numClasses % this.options.colors.length]
            this.classes2colors[cls] = color
            this.numClasses++
        }

        return color
    }

    // 拖拽开始
    dragStarted(d) {
        this.hideToolTips()
        if (!d.active) {
            this.simulation.alphaTarget(0.1).restart()
        }
        d.subject.fx = d.x
        d.subject.fy = d.y

        if (typeof this.options.onNodeDragStart === 'function') {
            this.options.onNodeDragStart(d)
        }
    }

    // 拖拽中
    dragged(d) {
        this.hideToolTips()
        this.stickNode(d)
    }

    // 拖拽结束
    dragEnded(d) {
        if (!d.active) {
            this.simulation.alphaTarget(0)
        }

        if (typeof this.options.onNodeDragEnd === 'function') {
            this.options.onNodeDragEnd(d)
        }
    }

    stickNode(d) {
        d.subject.fx = d.x
        d.subject.fy = d.y
    }

    // 图例说明
    formatLabelLegend() {
        this.labelLegend = []
        for (const key in this.classes2colors) {
            this.labelLegend.push({
                label: key,
                value: this.classes2colors[key],
            })
        }
        this.options.onGetLegend && this.options.onGetLegend(this.labelLegend)
    }

    // 固定点在某个位置
    fixNodes(d) {
        d.fx = d.x
        d.fy = d.y
    }

    // 清楚定在某个点
    // clearFixNodes(d) {
    //     d.fx = d.fy = null
    // }
}
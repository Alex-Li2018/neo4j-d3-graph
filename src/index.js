// 引入scss
import './scss/graph.scss'
import {
    merge,
    colors,
    contains,
} from './util/util'
import mix from './util/mixins'
import Nodes from './core/nodes'
import NodesPlate from './core/nodesPlate'
import RelationShips from './core/relationShips'
import TextWrap from './plugin/textWrap'
import ToolTips from './plugin/toolTips'

// Neo4jD3
export default class Neo4jD3 extends mix(Nodes, NodesPlate, RelationShips, TextWrap, ToolTips) {
    constructor(_selection, _options) {
        super()
        this.options = {
            // 箭头宽度
            arrowSize: 4,
            // 颜色
            colors: colors(),
            // 高亮实体的数据
            highlight: undefined,
            // 高亮边
            highlightRelationShip: undefined,
            // 数据
            neo4jData: undefined,
            // 请求url
            neo4jDataUrl: undefined,
            // node外边框的填充色
            nodeOutlineFillColor: undefined,
            // node的圆角
            nodeRadius: 25,
            // 连接线的宽度
            relationshipWidth: 1.5,
            // 关系连线的颜色
            relationshipColor: '#a5abb6',
            // 是否适配窗口大小
            zoomFit: false,
            // 节点之间的最小间隔
            minCollision: 60,
            // icon的映射
            iconMap: undefined,
            // events
            onNodeClick: undefined,
            onNodeDoubleClick: undefined,
            onNodeDragEnd: undefined,
            onNodeDragStart: undefined,
            onNodeMouseEnter: undefined,
            onNodeMouseover: undefined,
            onNodeMouseLeave: undefined,
            onNodeMouseOut: undefined,
            onRelationshipDoubleClick: undefined,
            onMenuNodeClick: undefined,
            onIconfontClick: undefined,
            onGetLegend: undefined,
        }
        // 节点
        this.nodes = []
        // 节点边
        this.relationships = []
        // 图例
        this.labelLegend = []

        this.container = undefined
        this.svg = undefined
        this.svgRelationships = undefined
        this.svgNodes = undefined
        this.imulation = undefined


        this.node = undefined
        this.relationship = undefined
        this.relationshipOutline = undefined
        this.relationshipOverlay = undefined
        this.relationshipText = undefined

        this.classes2colors = {}
        this.numClasses = 0
        this.info = undefined
        this.justLoaded = false
        this.svgScale = undefined
        this.svgTranslate = undefined

        this.init(_selection, _options)
    }

    init(_selection, _options) {
        if (!this.options.minCollision) {
            this.options.minCollision = this.options.nodeRadius * 2
        }
        merge(this.options, _options)

        // 初始化容器
        this.initContainer(_selection)

        // 初始化图的节点
        this.appendGraph()

        // 力学仿真布局
        this.simulation = this.initSimulation()

        // 获取数据
        if (this.options.neo4jData) {
            this.loadNeo4jData(this.options.neo4jData)
        } else if (this.options.neo4jDataUrl) {
            this.loadNeo4jDataFromUrl(this.options.neo4jDataUrl)
        } else {
            // eslint-disable-next-line no-console
            console.error('Error: both neo4jData and neo4jDataUrl are empty!')
        }
    }

    initContainer(_selection) {
        this.container = d3.select(_selection)

        this.container
            .attr('class', 'neo4jd3')
            .html('')
    }

    appendGraph() {
        const self = this
        this.svg = this.container
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('class', 'neo4jd3-graph')
            .call(d3.zoom().on('zoom', (e) => {
                let scale = e.transform.k
                const translate = [e.transform.x, e.transform.y]

                if (self.svgTranslate) {
                    translate[0] += self.svgTranslate[0]
                    translate[1] += self.svgTranslate[1]
                }

                if (self.svgScale) {
                    scale *= self.svgScale
                }

                self.svg.attr('transform', `translate(${translate[0]}, ${translate[1]}) scale(${scale})`)
            }))
            .on('click', (e) => {
                // 清楚线的高亮
                d3.selectAll('.relationship .text')
                    .classed('active_text', false)

                // 关闭所有的操作表盘
                d3.selectAll('.context-menu-item')
                    .each(function () {
                        d3.select(this).classed('context-show', false)
                    })
                e.stopPropagation()
            })
            .on('dblclick.zoom', null)
            .append('g')
            .attr('width', '100%')
            .attr('height', '100%')

        // 链接线 relationShips
        this.svgRelationships = this.svg
            .append('g')
            .attr('class', 'relationships')

        // 实体节点 nodes
        this.svgNodes = this.svg
            .append('g')
            .attr('class', 'nodes')
    }

    initSimulation() {
    // 力学仿真(动画效果)

        // 力模拟的强大功能和灵活性以力函数为中心,力函数可以调整元素的位置和速度,以实现吸引排斥碰撞的效果
        /**
         * d3内置的力模型
         * forceCenter 用于设置系统重心
         * forceManyBody 使元素相互吸引排斥
         * forceCollide 使元素防止重叠
         * forceLink 用于链接元素之间创建固定距离
         *
         * 文档: https://www.d3indepth.com/force-layout/
         */
        const simulation = d3.forceSimulation()
        // 碰撞力 防止节点重叠
            .force('collide', d3.forceCollide().radius(() => this.options.minCollision).iterations(2))
        // 电荷力 吸引 排斥
            .force('charge', d3.forceManyBody())
        // // 弹簧力 将有关系的节点 拉近 推远
            .force('link', d3.forceLink().id(d => d.id))
        // 创建向心力模型,中心是界面的重点
            .force('center', d3.forceCenter(
                this.svg.node().parentElement.parentElement.clientWidth / 2,
                this.svg.node().parentElement.parentElement.clientHeight / 2,
            ))
        // 指定迭代次数并仿真
            .on('tick', () => {
                this.tick()
            })
            .on('end', () => {
                if (this.options.zoomFit && !this.justLoaded) {
                    this.justLoaded = true
                    this.zoomFit(2)
                }
            })

        return simulation
    }

    // 获取neo4jData
    loadNeo4jData() {
        this.nodes = []
        this.relationships = []

        this.updateWithNeo4jData(this.options.neo4jData)
    }

    loadNeo4jDataFromUrl(neo4jDataUrl) {
        const self = this
        this.nodes = []
        this.relationships = []

        d3.json(neo4jDataUrl, (error, data) => {
            if (error) {
                throw error
            }

            self.updateWithNeo4jData(data)
        })
    }

    // 更新neo4j的数据
    updateWithNeo4jData(neo4jData) {
        const d3Data = this.neo4jDataToD3Data(neo4jData)
        // 进行渲染
        this.updateWithD3Data(d3Data)
    }

    updateWithD3Data(d3Data) {
        this.updateNodesAndRelationships(d3Data.nodes, d3Data.relationships)
    }

    // 渲染nodes 以及 relationships
    updateNodesAndRelationships(n, r) {
        this.updateRelationships(r)
        this.updateNodes(n)

        this.simulation.nodes(this.nodes)
        this.simulation
            .force('link')
            .links(this.relationships)
    }

    // 将neo4j的数据变为D3的数据格式
    // eslint-disable-next-line class-methods-use-this
    neo4jDataToD3Data(res) {
        const graph = {
            nodes: [],
            relationships: [],
        }

        res.results.forEach((result) => {
            result.data.forEach((data) => {
                data.graph.nodes.forEach((node) => {
                    if (!contains(graph.nodes, node.id)) {
                        graph.nodes.push(node)
                    }
                })

                data.graph.relationships.forEach((relationship) => {
                    // 给边增加 source target naturalAngle isLoop 四个属性
                    relationship.source = relationship.startNode
                    relationship.target = relationship.endNode
                    relationship.naturalAngle = 0
                    relationship.isLoop = function () {
                        return this.source === this.target
                    }
                    graph.relationships.push(relationship)
                })

                // 边的排序
                data.graph.relationships.sort((a, b) => {
                    // 先让小的source排前面 大的排后面
                    if (a.source > b.source) {
                        return 1
                    }
                    if (a.source < b.source) {
                        return -1
                    }
                    // 先让小的target排前面 大的排后面
                    if (a.target > b.target) {
                        return 1
                    }
                    if (a.target < b.target) {
                        return -1
                    }
                    return 0
                })
            })
        })

        return graph
    }

    tick() {
        this.tickNodes()
        // 将点和线链接起来
        this.tickRelationships()
    }

    zoomFit() {
        const bounds = this.svg.node().getBBox()
        const parent = this.svg.node().parentElement.parentElement
        const fullWidth = parent.clientWidth
        const fullHeight = parent.clientHeight
        const { width } = bounds
        const { height } = bounds
        const midX = bounds.x + width / 2
        const midY = bounds.y + height / 2

        if (width === 0 || height === 0) {
            return // nothing to fit
        }

        this.svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight)
        this.svgTranslate = [
            fullWidth / 2 - this.svgScale * midX,
            fullHeight / 2 - this.svgScale * midY,
        ]

        this.svg.attr('transform', `translate(${this.svgTranslate[0]}, ${this.svgTranslate[1]}) scale(${this.svgScale})`)
        // smoothTransform(svgTranslate, svgScale);
    }

    size() {
        return {
            nodes: this.nodes.length,
            relationships: this.relationships.length,
        }
    }
}
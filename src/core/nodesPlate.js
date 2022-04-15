import toolsIcon from './neo4jToolsIcon'

export default class NodesPlate {
    constructor() {
    // 实体边 实体节点 点击了那些实体
        this.entityRelationship = []
        // this.entityNodes = []
        this.entityExit = []
    }

    appendMenuToNode(node) {
        const self = this

        function createMenuNode() {
            for (let i = 0; i < toolsIcon.length; i++) {
                const { title } = toolsIcon[i]

                const menuNode = node.append('g')
                    .classed('context-menu-item', true)
                    .classed(title, true)
                    .on('click', function (e, d) {
                        // 先清楚所有的操作栏
                        d3.selectAll('.context-menu-item')
                            .each(function () {
                                d3.select(this).classed('context-show', false)
                            })


                        // 展示 隐藏属性值
                        if (d3.select(this).attr('class').includes('AttrLink')) {
                            const ishowAttr = self.nodes.filter(
                                item => item.labels.includes('属性') && item.properties.$_parent_id === d.id,
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
                        }

                        // 展示联系边
                        if (d3.select(this).attr('class').includes('RelationLink')) {
                            if (self.entityExit.includes(d.id)) {
                                self.hideEntityNodeAndRelationShips(d)
                            } else {
                                self.showEntityNodeAndRelationShips(d)
                            }

                            if (typeof self.options.onMenuNodeClick === 'function') {
                                self.options.onMenuNodeClick({
                                    name: 'RelationLink',
                                    status: self.entityExit.includes(d.id),
                                    metaData: d,
                                })
                            }
                        }

                        e.stopPropagation()
                    })

                // 装路径
                menuNode.append('path')
                    .attr('fill', 'rgb(210, 213, 218)')
                    .attr('d', () => {
                        const numberOfItemsInContextMenu = toolsIcon.length
                        const innerRadius = Math.max(self.options.nodeRadius * 1.3, 20)

                        return d3.arc()({
                            startAngle: (2 * Math.PI / numberOfItemsInContextMenu) * i,
                            endAngle: (2 * Math.PI / numberOfItemsInContextMenu) * (i + 1),
                            innerRadius,
                            outerRadius: innerRadius + 30,
                            padAngle: 0.05,
                        })
                    })

                // 装icon
                menuNode.append('g')
                    .append(() => {
                        const rawSvgIcon = toolsIcon[i].value
                        const svgIcon = document.importNode(
                            new DOMParser()
                                .parseFromString(rawSvgIcon, 'application/xml')
                                .documentElement.firstChild,
                            true,
                        )
                        return svgIcon
                    })
                    .attr('color', '#fff')
                    .attr('transform', () => {
                        const numberOfItemsInContextMenu = toolsIcon.length
                        const innerRadius = Math.max(self.options.nodeRadius * 1.3, 20)

                        const arcGenerator = d3.arc()
                            .startAngle((2 * Math.PI / numberOfItemsInContextMenu) * i)
                            .endAngle((2 * Math.PI / numberOfItemsInContextMenu) * (i + 1))
                            .innerRadius(innerRadius)
                            .outerRadius(innerRadius + 30)
                            .padAngle(0.05)

                        const centroid = arcGenerator.centroid()
                        return `translate(${centroid[0] - 10}, ${centroid[1]}) scale(0.7)`
                    })
            }
        }

        return createMenuNode()
    }

    // -----------------实体对应的关系边操作方法------------------

    // 显示这个节点的对应关系边
    showEntityNodeAndRelationShips(d) {
        const {
            nodes: n,
            // filterNodes,
            relationships: r,
        } = this.filterShowNodeAndRelationShips(d)
        this.entityRelationship = this.entityRelationship.concat(r)
        this.entityExit.push(d.id)

        this.updateAttrOrEntityNodesAndRelationships(
            n,
            this.entityRelationship,
            false,
            true,
        )
    }

    // 隐藏这个节点对应的关系边
    hideEntityNodeAndRelationShips(d) {
        const {
            nodes: n,
            relationships: r,
        } = this.filterHideNodeAndRelationShips(d)

        this.entityRelationship = Array.prototype.concat.apply([], r)

        this.updateAttrOrEntityNodesAndRelationships(
            n,
            this.entityRelationship,
            false,
            true,
        )
    }

    filterShowNodeAndRelationShips(d) {
        const {
            nodes: n,
            relationships: r,
        } = this.getOptionsNeo4jData()

        // 筛选出对应边和节点
        const set = new Set()
        const filterRelationships = r.filter((item) => {
            if (item.startNode === d.id || item.endNode === d.id) {
                set.add(item.startNode)
                set.add(item.endNode)
            }

            return item.startNode === d.id || item.endNode === d.id
        })

        const filterNodes = n.filter(item => set.has(item.id))

        return {
            nodes: n,
            filterNodes,
            relationships: filterRelationships,
        }
    }

    filterHideNodeAndRelationShips(d) {
        const {
            nodes,
        } = this.getOptionsNeo4jData()

        // 1. 根据当前节点找到与之相关联的节点
        const set = new Set()
        this.relationships.forEach((item) => {
            if (item.startNode === d.id || item.endNode === d.id) {
                set.add(item.startNode)
                set.add(item.endNode)
            }
        })

        const filterRelationships = this.relationships.filter((item) => {
            if (set.has(item.startNode)) {
                return false
            }
            return !set.has(item.endNode)
        })

        // 点击过的点的处理
        this.entityExit = this.entityExit.filter(item => !set.has(item))

        return {
            nodes,
            relationships: filterRelationships,
        }
    }

    getOptionsNeo4jData() {
        let nodes = []
        let relationships = []

        this.options.neo4jData.results.forEach((result) => {
            result.data.forEach((data) => {
                nodes = nodes.concat(data.graph.nodes)
                relationships = relationships.concat(data.graph.relationships)
            })
        })

        return {
            nodes,
            relationships,
        }
    }

    // --------------实体对应的属性操作方法------------

    // 隐藏实体周边的属性
    hidePropertiesNodeAndRelationShips(d) {
    // 只隐藏当前实体的属性
        const nodes = this.nodes.filter(
            item => !item.labels.includes('属性') || item.properties.$_parent_id !== d.id,
        )
        const relationships = this.relationships.filter(
            item => item.properties.$_custom_relation_properties_union !== '属性' || item.properties.$_parent_id !== d.id,
        )

        this.updateAttrOrEntityNodesAndRelationships(nodes, relationships, false, true)
    }

    // 将实体周边的属性全部显示出来
    showPropertiesNodeAndRelationShips(d) {
        const {
            nodes: n,
            relationShips: r,
        } = this.formatAttrNodesAndRelationShipsData(d)

        // 该节点没有属性
        if (!n && !r) return

        this.updateAttrOrEntityNodesAndRelationships(
            n.concat(d),
            r,
            true,
            true,
        )
    }

    // isHide 控制nodes节点的增加与减少
    updateAttrOrEntityNodesAndRelationships(n, r, isAttr, isHide) {
        this.updateRelationships(r, true)
        this.updateNodes(n, isAttr, isHide)

        this.simulation.nodes(this.nodes)
        this.simulation
            .force('link')
            .links(this.relationships)
    }

    // 找到当前的实体属性并将其变为对应的nodes节点和relationship边
    formatAttrNodesAndRelationShipsData(d) {
        const nodes = []
        const relationShips = []
        const {
            nodes: nodesLength,
            relationships: relationshipsLength,
        } = this.size()

        let nodeid = nodesLength * 100
        let relationid = relationshipsLength * 100

        if (!d.properties4show || !d.properties4show.length) return {}

        for (const obj of d.properties4show) {
            nodeid += 1
            relationid += 1

            nodes.push({
                id: `${nodeid}`,
                labels: ['属性'],
                properties: {
                    name: obj.value,
                    // 用来找到父节点
                    $_parent_id: d.id,
                },
                x: d.x,
                y: d.y,
                nodeType: obj.nodeType,
                // 元数据
                originData: obj,
            })

            relationShips.push({
                endNode: `${nodeid}`,
                id: relationid,
                properties: {
                    $_custom_relation_properties_union: '属性',
                    // 用来找到父节点
                    $_parent_id: d.id,
                },
                startNode: d.id,
                type: obj.key,
                source: d.id,
                target: `${nodeid}`,
                linknum: 1,
            })
        }

        return {
            nodes,
            relationShips,
        }
    }
}
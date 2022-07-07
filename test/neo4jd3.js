(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Neo4jd3 = factory());
})(this, (function () { 'use strict';

    function merge(target, source) {
        Object.keys(source).forEach((property) => {
            target[property] = source[property];
        });
    }

    function colors() {
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

    function contains(array, id) {
        const filter = array.filter(elem => elem.id === id);

        return filter.length > 0
    }

    // mix-in 将多个类混入进一个类

    function copyProperties(target, source) {
        // eslint-disable-next-line no-restricted-syntax
        for (const key of Reflect.ownKeys(source)) {
            if (key !== 'constructor'
          && key !== 'prototype'
          && key !== 'name'
            ) {
                const desc = Object.getOwnPropertyDescriptor(source, key);
                Object.defineProperty(target, key, desc);
            }
        }
    }

    function mix(...mixins) {
        class Mix {
            constructor() {
                // eslint-disable-next-line no-restricted-syntax
                for (const mixin of mixins) {
                    // eslint-disable-next-line new-cap
                    copyProperties(this, new mixin()); // 拷贝实例属性
                }
            }
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const mixin of mixins) {
            copyProperties(Mix, mixin); // 拷贝静态属性
            copyProperties(Mix.prototype, mixin.prototype); // 拷贝原型属性
        }

        return Mix
    }

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
     class Nodes {
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
                Array.prototype.push.apply(this.nodes, n);
            } else {
                this.nodes = Array.prototype.concat.apply([], n);
            }

            // 将nodes下面的node数据
            this.node = this.svgNodes
                .selectAll('.node')
                .data(this.nodes, d => d.id);
            const nodeEnter = this.appendNodeToGraph(isAttr);

            // 合并update与enter的数据集
            nodeEnter.merge(this.node);
            this.node.exit().remove();
            this.node = this.svgNodes.selectAll('.node');
        }

        appendNodeToGraph(isAttr = false) {
            // 链接g模块
            const n = this.appendNode();
            // ring为外层hover的轮廓
            this.appendRingToNode(n);
            // outline是圆心
            this.appendOutlineToNode(n);
            // 添加文本或者img
            this.appendTextToNode(n);

            if (!isAttr) {
                // 添加点击之后的菜单栏
                this.options.showNodePlate && this.appendMenuToNode(n);
            }

            // 显示图例
            this.formatLabelLegend();

            return n
        }

        appendNode() {
            // enter: data数据没有绑定到与dom的元素合集
            const self = this;
            let ishowToolTip = false;

            return this.node.enter()
                .append('g')
                .attr('class', (d) => {
                    let highlight;
                    let i;
                    let classes = 'node';

                    if (this.options.highlight) {
                        for (i = 0; i < this.options.highlight.length; i++) {
                            highlight = this.options.highlight[i];

                            if (Number(d.id) === Number(highlight.id)) {
                                classes += ' node-highlighted';
                                classes += (highlight.class || '');
                                break
                            }
                        }
                    }

                    return classes
                })
                .each((d) => {
                    const { highlight } = self.options;
                    // 只有一个
                    if (highlight.length === 1 && highlight.includes(d.id)) {
                        d.fx = self.svg.node().parentElement.parentElement.clientWidth / 2;
                        d.fy = self.svg.node().parentElement.parentElement.clientHeight / 2;
                    }
                })
                .on('click', function (e, d) {
                    const did = d.id;
                    // 点击的时候固定点
                    self.fixNodes(d);
                    if (d.labels[0] === '属性') {
                        d.nodeType === 'iconfont' && typeof self.options.onIconfontClick === 'function' && self.options.onIconfontClick(d);
                        return
                    }


                    // 显示当前的操作栏
                    d3.select(this)
                        .selectAll('.context-menu-item');

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
                            });
                        });

                    if (typeof self.options.onNodeClick === 'function') {
                        self.options.onNodeClick(e, d, d3);
                    }

                    e.stopPropagation();
                })
                .on('dblclick', (e, d) => {
                    self.fixNodes(d);

                    if (typeof self.options.onNodeDoubleClick === 'function') {
                        self.options.onNodeDoubleClick(e, d, d3);
                    }

                    // 先清楚所有的操作栏
                    d3.selectAll('.context-menu-item')
                        .each(function () {
                            d3.select(this).classed('context-show', false);
                        });

                    

                    if (!d.properties4show || !d.properties4show.length) return

                    // 展示 隐藏属性值
                    const ishowAttr = self.nodes.filter(
                        item => item.labels.includes('属性')
                              && item.properties.$_parent_id === d.id,
                    );

                    if (ishowAttr && ishowAttr.length) {
                        self.hidePropertiesNodeAndRelationShips(d);
                    } else {
                        self.showPropertiesNodeAndRelationShips(d);
                    }

                    if (typeof self.options.onMenuNodeClick === 'function') {
                        self.options.onMenuNodeClick({
                            name: 'AttrLink',
                            status: !!ishowAttr.length,
                            metaData: d,
                        });
                    }

                    e.stopPropagation();
                })
                .on('mouseenter', (e, d) => {
                    if (typeof self.options.onNodeMouseEnter === 'function') {
                        self.options.onNodeMouseEnter(e, d, d3);
                    }

                    e.stopPropagation();
                })
                .on('mouseover', (e, d) => {
                    // 超出省略的处理tooltip,如果是nodeType的类型为iconfont,那么不超出显示
                    if (d.nodeType !== 'iconfont') {
                        const text = d.properties.name;
                        ishowToolTip = self.calcTextLine(text, self.options.nodeRadius * 2 - 6) > 1;
                        if (!ishowToolTip) return
                        self.showToolTips(text);
                    }


                    if (typeof self.options.onNodeMouseEnter === 'function') {
                        self.options.onNodeMouseover(e, d, d3);
                    }

                    e.stopPropagation();
                })
                .on('mousemove', (e) => {
                    if (!ishowToolTip) return

                    const pageX = `${e.pageX + 10}px`;
                    const pageY = `${e.pageY - 10}px`;
                    self.moveToolTips(pageY, pageX);

                    e.stopPropagation();
                })
                .on('mouseleave', (e, d) => {
                    if (typeof self.options.onNodeMouseLeave === 'function') {
                        self.options.onNodeMouseLeave(e, d);
                    }

                    e.stopPropagation();
                })
                .on('mouseout', (e, d) => {
                    // 移出隐藏tooltip
                    self.hideToolTips();

                    if (typeof self.options.onNodeMouseOut === 'function') {
                        self.options.onNodeMouseOut(e, d, d3);
                    }

                    e.stopPropagation();
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
            const self = this;

            return node.append('text')
                .attr('fill', '#ffffff')
                .attr('font-size', '10px')
                .attr('pointer-events', 'none')
                .attr('text-anchor', 'middle')
                .attr('y', '5px')
                .attr('x', '0px')
                .each(function (d) {
                    if (d.nodeType === 'iconfont') {
                        const name = `${d.properties.name}`;
                        d3.select(this)
                            .attr('class', 'iconfontKG iconfont-kg-neo4j3d')
                            .attr('font-size', '20px')
                            .attr('y', '8px')
                            .html(() => `&#x${self.options.iconMap[name]}`);
                    } else {
                        // 防御性编程: 防止属性名不是字符串而是number
                        const name = `${d.properties.name}`;
                        self.wrapEllipsisText(d3.select(this), name, self.options.nodeRadius * 2 - 12);
                    }
                })
        }

        // 节点的关系变展示
        tickNodes() {
            if (this.node) {
                this.node.attr('transform', d => `translate(${d.x}, ${d.y})`);
            }
        }

        // 颜色的处理
        class2darkenColor(cls) {
            return d3.rgb(this.class2color(cls)).darker(1)
        }

        class2color(cls) {
            let color = this.classes2colors[cls];

            if (!color) {
                color = this.options.colors[this.numClasses % this.options.colors.length];
                this.classes2colors[cls] = color;
                this.numClasses++;
            }

            return color
        }

        // 拖拽开始
        dragStarted(d) {
            this.hideToolTips();
            if (!d.active) {
                this.simulation.alphaTarget(0.1).restart();
            }
            d.subject.fx = d.x;
            d.subject.fy = d.y;

            if (typeof this.options.onNodeDragStart === 'function') {
                this.options.onNodeDragStart(d);
            }
        }

        // 拖拽中
        dragged(d) {
            this.hideToolTips();
            this.stickNode(d);
        }

        // 拖拽结束
        dragEnded(d) {
            if (!d.active) {
                this.simulation.alphaTarget(0);
            }

            if (typeof this.options.onNodeDragEnd === 'function') {
                this.options.onNodeDragEnd(d);
            }
        }

        stickNode(d) {
            d.subject.fx = d.x;
            d.subject.fy = d.y;
        }

        // 图例说明
        formatLabelLegend() {
            this.labelLegend = [];
            for (const key in this.classes2colors) {
                this.labelLegend.push({
                    label: key,
                    value: this.classes2colors[key],
                });
            }
            this.options.onGetLegend && this.options.onGetLegend(this.labelLegend);
        }

        // 固定点在某个位置
        fixNodes(d) {
            d.fx = d.x;
            d.fy = d.y;
        }

        // 清楚定在某个点
        // clearFixNodes(d) {
        //     d.fx = d.fy = null
        // }
    }

    const icons = [
        {
            title: 'RelationLink',
            // eslint-disable-next-line max-len
            value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g class="icon"><defs><style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style></defs><title>AttrLink / Collapse</title><circle class="a" cx="13.5" cy="10.498" r="3.75"/><circle class="a" cx="21" cy="2.998" r="2.25"/><circle class="a" cx="21" cy="15.748" r="2.25"/><circle class="a" cx="13.5" cy="20.998" r="2.25"/><circle class="a" cx="3" cy="20.998" r="2.25"/><circle class="a" cx="3.75" cy="5.248" r="2.25"/><line class="a" x1="16.151" y1="7.848" x2="19.411" y2="4.588"/><line class="a" x1="16.794" y1="12.292" x2="19.079" y2="14.577"/><line class="a" x1="13.5" y1="14.248" x2="13.5" y2="18.748"/><line class="a" x1="10.851" y1="13.147" x2="4.59" y2="19.408"/><line class="a" x1="10.001" y1="9.149" x2="5.61" y2="6.514"/></g></svg>',
        },
        // {
        //   title: 'Unlock',
        // eslint-disable-next-line max-len
        //   value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g class="icon"><defs><style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style></defs><title>Unlock</title><path class="a" d="M.75,9.75V6a5.25,5.25,0,0,1,10.5,0V9.75"/><rect class="a" x="6.75" y="9.75" width="16.5" height="13.5" rx="1.5" ry="1.5"/><line class="a" x1="15" y1="15" x2="15" y2="18"/></g></svg>',
        // },
        {
            title: 'AttrLink',
            // eslint-disable-next-line max-len
            value: '<svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-1114.000000, -705.000000)" fill-rule="nonzero"><g id="属性管理" transform="translate(1114.000000, 705.000000)"><rect id="矩形" fill="#ffffff" opacity="0" x="0" y="0" width="32" height="32"></rect><path d="M13.996875,20.1773437 L8.03671875,20.1773437 C8.02734375,20.1773437 8.01796875,20.1773437 8.00859375,20.1796875 L3.86015625,20.1796875 L3.86015625,3.7921875 L20.2476563,3.7921875 L20.2476563,9.4921875 L20.2523438,9.4921875 L20.2523438,13.0640625 C20.2523438,13.4765625 20.5851563,13.809375 20.9976563,13.809375 C21.4101562,13.809375 21.7429688,13.4765625 21.7429688,13.0640625 L21.7429688,6.3609375 C21.7429688,6.33515625 21.740625,6.30703125 21.7382813,6.28125 L21.7382813,3.7921875 C21.7382813,2.971875 21.0703125,2.3015625 20.2476563,2.3015625 L3.86015625,2.3015625 C3.03984375,2.3015625 2.36953125,2.96953125 2.36953125,3.7921875 L2.36953125,20.1796875 C2.36953125,21 3.0375,21.6703125 3.86015625,21.6703125 L10.9148438,21.6703125 L10.9148438,21.6679687 L13.9945313,21.6679687 C14.4070313,21.6679687 14.7398438,21.3351562 14.7398438,20.9226562 C14.7398438,20.5101563 14.4070312,20.1773437 13.996875,20.1773437 Z" id="路径" fill="#ffffff"></path><path d="M6.8578125,7.97578125 L13.771875,7.97578125 C14.184375,7.97578125 14.5171875,7.64296875 14.5171875,7.23046875 C14.5171875,6.81796875 14.184375,6.48515625 13.771875,6.48515625 L6.8578125,6.48515625 C6.4453125,6.48515625 6.1125,6.81796875 6.1125,7.23046875 C6.1125,7.64296875 6.44765625,7.97578125 6.8578125,7.97578125 Z M17.1984375,10.3476562 C17.1984375,9.93515625 16.865625,9.60234375 16.453125,9.60234375 L6.8578125,9.60234375 C6.4453125,9.60234375 6.1125,9.93515625 6.1125,10.3476562 C6.1125,10.7601563 6.4453125,11.0929688 6.8578125,11.0929688 L16.453125,11.0929688 C16.865625,11.0929688 17.1984375,10.7578125 17.1984375,10.3476562 Z" id="形状" fill="#ffffff"></path><path d="M15.8101395,7.96312739 C16.0716241,8.07147026 16.3710471,8.03207195 16.595605,7.85977525 C16.8201628,7.68747854 16.9357347,7.40846327 16.8987805,7.12784474 C16.8618263,6.8472262 16.6779611,6.60764332 16.4164535,6.49935577 C16.1549689,6.39101289 15.8555459,6.43041121 15.6309881,6.60270791 C15.4064302,6.77500461 15.2908583,7.05401989 15.3278125,7.33463842 C15.3647667,7.61525695 15.548632,7.85483984 15.8101395,7.96312739 L15.8101395,7.96312739 Z" id="路径" fill="#ffffff"></path><path d="M19.2445313,16.3335937 C18.80625,16.2164062 18.3492187,16.2773438 17.9554688,16.5023438 C17.1445312,16.9710938 16.865625,18.0117188 17.334375,18.8226563 C17.6484375,19.3664063 18.2203125,19.6710938 18.8085938,19.6710938 C19.096875,19.6710938 19.3898438,19.5984375 19.6570313,19.44375 C19.6734375,19.434375 19.6875,19.425 19.7039063,19.415625 C19.9125,19.284375 19.978125,19.0101563 19.846875,18.7992188 C19.715625,18.590625 19.4414062,18.525 19.2304688,18.65625 C19.2234375,18.6609375 19.2140625,18.665625 19.209375,18.6703125 C18.825,18.8929688 18.3304688,18.759375 18.1101563,18.375 C17.8875,17.990625 18.0210938,17.4960938 18.4054688,17.2757813 C18.590625,17.1679688 18.8085938,17.1398438 19.0171875,17.1960937 C19.2257813,17.2523438 19.3992188,17.3859375 19.5070313,17.5710937 C19.5796875,17.6953125 19.6171875,17.8359375 19.6148438,17.9789063 C19.6125,18.225 19.8117188,18.4265625 20.0578125,18.4289063 L20.0625,18.4289063 C20.3085938,18.4289063 20.5078125,18.2320313 20.5101563,17.9859375 C20.5125,17.6835938 20.4351563,17.3859375 20.2828125,17.1234375 C20.0484375,16.7320313 19.6828125,16.4507813 19.2445313,16.3335938 L19.2445313,16.3335937 Z M6.8578125,12.7195313 C6.4453125,12.7195313 6.1125,13.0523438 6.1125,13.4648438 C6.1125,13.8773437 6.4453125,14.2101562 6.8578125,14.2101562 L13.846875,14.2101562 C14.259375,14.2101562 14.5921875,13.8773437 14.5921875,13.4648438 C14.5921875,13.0523438 14.259375,12.7195313 13.846875,12.7195313 L6.8578125,12.7195313 Z" id="形状" fill="#ffffff"></path></g></g></g></svg>',
        },
    ];

    class NodesPlate {
        constructor() {
        // 实体边 实体节点 点击了那些实体
            this.entityRelationship = [];
            // this.entityNodes = []
            this.entityExit = [];
        }

        appendMenuToNode(node) {
            const self = this;

            function createMenuNode() {
                for (let i = 0; i < icons.length; i++) {
                    const { title } = icons[i];

                    const menuNode = node.append('g')
                        .classed('context-menu-item', true)
                        .classed(title, true)
                        .on('click', function (e, d) {
                            // 先清楚所有的操作栏
                            d3.selectAll('.context-menu-item')
                                .each(function () {
                                    d3.select(this).classed('context-show', false);
                                });


                            // 展示 隐藏属性值
                            if (d3.select(this).attr('class').includes('AttrLink')) {
                                const ishowAttr = self.nodes.filter(
                                    item => item.labels.includes('属性') && item.properties.$_parent_id === d.id,
                                );

                                if (ishowAttr && ishowAttr.length) {
                                    self.hidePropertiesNodeAndRelationShips(d);
                                } else {
                                    self.showPropertiesNodeAndRelationShips(d);
                                }

                                if (typeof self.options.onMenuNodeClick === 'function') {
                                    self.options.onMenuNodeClick({
                                        name: 'AttrLink',
                                        status: !!ishowAttr.length,
                                        metaData: d,
                                    });
                                }
                            }

                            // 展示联系边
                            if (d3.select(this).attr('class').includes('RelationLink')) {
                                if (self.entityExit.includes(d.id)) {
                                    self.hideEntityNodeAndRelationShips(d);
                                } else {
                                    self.showEntityNodeAndRelationShips(d);
                                }

                                if (typeof self.options.onMenuNodeClick === 'function') {
                                    self.options.onMenuNodeClick({
                                        name: 'RelationLink',
                                        status: self.entityExit.includes(d.id),
                                        metaData: d,
                                    });
                                }
                            }

                            e.stopPropagation();
                        });

                    // 装路径
                    menuNode.append('path')
                        .attr('fill', 'rgb(210, 213, 218)')
                        .attr('d', () => {
                            const numberOfItemsInContextMenu = icons.length;
                            const innerRadius = Math.max(self.options.nodeRadius * 1.3, 20);

                            return d3.arc()({
                                startAngle: (2 * Math.PI / numberOfItemsInContextMenu) * i,
                                endAngle: (2 * Math.PI / numberOfItemsInContextMenu) * (i + 1),
                                innerRadius,
                                outerRadius: innerRadius + 30,
                                padAngle: 0.05,
                            })
                        });

                    // 装icon
                    menuNode.append('g')
                        .append(() => {
                            const rawSvgIcon = icons[i].value;
                            const svgIcon = document.importNode(
                                new DOMParser()
                                    .parseFromString(rawSvgIcon, 'application/xml')
                                    .documentElement.firstChild,
                                true,
                            );
                            return svgIcon
                        })
                        .attr('color', '#fff')
                        .attr('transform', () => {
                            const numberOfItemsInContextMenu = icons.length;
                            const innerRadius = Math.max(self.options.nodeRadius * 1.3, 20);

                            const arcGenerator = d3.arc()
                                .startAngle((2 * Math.PI / numberOfItemsInContextMenu) * i)
                                .endAngle((2 * Math.PI / numberOfItemsInContextMenu) * (i + 1))
                                .innerRadius(innerRadius)
                                .outerRadius(innerRadius + 30)
                                .padAngle(0.05);

                            const centroid = arcGenerator.centroid();
                            return `translate(${centroid[0] - 10}, ${centroid[1]}) scale(0.7)`
                        });
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
            } = this.filterShowNodeAndRelationShips(d);
            this.entityRelationship = this.entityRelationship.concat(r);
            this.entityExit.push(d.id);

            this.updateAttrOrEntityNodesAndRelationships(
                n,
                this.entityRelationship,
                false,
                true,
            );
        }

        // 隐藏这个节点对应的关系边
        hideEntityNodeAndRelationShips(d) {
            const {
                nodes: n,
                relationships: r,
            } = this.filterHideNodeAndRelationShips(d);

            this.entityRelationship = Array.prototype.concat.apply([], r);

            this.updateAttrOrEntityNodesAndRelationships(
                n,
                this.entityRelationship,
                false,
                true,
            );
        }

        filterShowNodeAndRelationShips(d) {
            const {
                nodes: n,
                relationships: r,
            } = this.getOptionsNeo4jData();

            // 筛选出对应边和节点
            const set = new Set();
            const filterRelationships = r.filter((item) => {
                if (item.startNode === d.id || item.endNode === d.id) {
                    set.add(item.startNode);
                    set.add(item.endNode);
                }

                return item.startNode === d.id || item.endNode === d.id
            });

            const filterNodes = n.filter(item => set.has(item.id));

            return {
                nodes: n,
                filterNodes,
                relationships: filterRelationships,
            }
        }

        filterHideNodeAndRelationShips(d) {
            const {
                nodes,
            } = this.getOptionsNeo4jData();

            // 1. 根据当前节点找到与之相关联的节点
            const set = new Set();
            this.relationships.forEach((item) => {
                if (item.startNode === d.id || item.endNode === d.id) {
                    set.add(item.startNode);
                    set.add(item.endNode);
                }
            });

            const filterRelationships = this.relationships.filter((item) => {
                if (set.has(item.startNode)) {
                    return false
                }
                return !set.has(item.endNode)
            });

            // 点击过的点的处理
            this.entityExit = this.entityExit.filter(item => !set.has(item));

            return {
                nodes,
                relationships: filterRelationships,
            }
        }

        getOptionsNeo4jData() {
            let nodes = [];
            let relationships = [];

            this.options.neo4jData.results.forEach((result) => {
                result.data.forEach((data) => {
                    nodes = nodes.concat(data.graph.nodes);
                    relationships = relationships.concat(data.graph.relationships);
                });
            });

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
            );
            const relationships = this.relationships.filter(
                item => item.properties.$_custom_relation_properties_union !== '属性' || item.properties.$_parent_id !== d.id,
            );

            this.updateAttrOrEntityNodesAndRelationships(nodes, relationships, false, true);
        }

        // 将实体周边的属性全部显示出来
        showPropertiesNodeAndRelationShips(d) {
            const {
                nodes: n,
                relationShips: r,
            } = this.formatAttrNodesAndRelationShipsData(d);

            // 该节点没有属性
            if (!n && !r) return

            this.updateAttrOrEntityNodesAndRelationships(
                n.concat(d),
                r,
                true,
                true,
            );
        }

        // isHide 控制nodes节点的增加与减少
        updateAttrOrEntityNodesAndRelationships(n, r, isAttr, isHide) {
            this.updateRelationships(r, true);
            this.updateNodes(n, isAttr, isHide);

            this.simulation.nodes(this.nodes);
            this.simulation
                .force('link')
                .links(this.relationships);
        }

        // 找到当前的实体属性并将其变为对应的nodes节点和relationship边
        formatAttrNodesAndRelationShipsData(d) {
            const nodes = [];
            const relationShips = [];
            const {
                nodes: nodesLength,
                relationships: relationshipsLength,
            } = this.size();

            let nodeid = nodesLength * 100;
            let relationid = relationshipsLength * 100;

            if (!d.properties4show || !d.properties4show.length) return {}

            for (const obj of d.properties4show) {
                nodeid += 1;
                relationid += 1;

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
                });

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
                });
            }

            return {
                nodes,
                relationShips,
            }
        }
    }

    class NodePair {
        constructor(source, traget) {
            this.nodeA;
            this.nodeB;
            this.relationships = [];

            if (source.id < traget.id) {
                this.nodeA = source;
                this.nodeB = traget;
            } else {
                this.nodeA = traget;
                this.nodeB = source;
            }
        }

        isLoop() {
            return this.nodeA === this.nodeB;
        }

        // 当对象属性以对象作为key的时候取值去这里的否则是[object Object]
        toString() {
            return `${this.nodeA.id}:${this.nodeB.id}`;
        }
    }

    class ArcArrow {
        constructor(
            startRadius,
            endRadius,
            endCentre,
            _deflection,
            arrowWidth,
            headWidth,
            headLength,
            captionLayout,
        ) {
            this.deflection = _deflection;
            const square = l => l * l;

            const deflectionRadians = (this.deflection * Math.PI) / 180;
            const startAttach = {
                x: Math.cos(deflectionRadians) * startRadius,
                y: Math.sin(deflectionRadians) * startRadius,
            };

            const radiusRatio = startRadius / (endRadius + headLength);
            const homotheticCenter = (-endCentre * radiusRatio) / (1 - radiusRatio);

            const intersectWithOtherCircle = function (
                fixedPoint,
                radius,
                xCenter,
                polarity,
            ) {
                const gradient = fixedPoint.y / (fixedPoint.x - homotheticCenter);
                const hc = fixedPoint.y - gradient * fixedPoint.x;

                const A = 1 + square(gradient);
                const B = 2 * (gradient * hc - xCenter);
                const C = square(hc) + square(xCenter) - square(radius);

                const intersection = {
                    x: (-B + polarity * Math.sqrt(square(B) - 4 * A * C)) / (2 * A),
                };
                intersection.y = (intersection.x - homotheticCenter) * gradient;

                return intersection;
            };

            const endAttach = intersectWithOtherCircle(
                startAttach,
                endRadius + headLength,
                endCentre,
                -1,
            );

            const g1 = -startAttach.x / startAttach.y;
            const c1 = startAttach.y + square(startAttach.x) / startAttach.y;
            const g2 = -(endAttach.x - endCentre) / endAttach.y;
            const c2 = endAttach.y + ((endAttach.x - endCentre) * endAttach.x) / endAttach.y;

            const cx = (c1 - c2) / (g2 - g1);
            const cy = g1 * cx + c1;

            const arcRadius = Math.sqrt(
                square(cx - startAttach.x) + square(cy - startAttach.y),
            );
            const startAngle = Math.atan2(startAttach.x - cx, cy - startAttach.y);
            const endAngle = Math.atan2(endAttach.x - cx, cy - endAttach.y);
            let sweepAngle = endAngle - startAngle;
            if (this.deflection > 0) {
                sweepAngle = 2 * Math.PI - sweepAngle;
            }

            this.shaftLength = sweepAngle * arcRadius;
            if (startAngle > endAngle) {
                this.shaftLength = 0;
            }

            let midShaftAngle = (startAngle + endAngle) / 2;
            if (this.deflection > 0) {
                midShaftAngle += Math.PI;
            }
            this.midShaftPoint = {
                x: cx + arcRadius * Math.sin(midShaftAngle),
                y: cy - arcRadius * Math.cos(midShaftAngle),
            };

            const startTangent = function (dr) {
                const dx = (dr < 0 ? 1 : -1) * Math.sqrt(square(dr) / (1 + square(g1)));
                const dy = g1 * dx;
                return {
                    x: startAttach.x + dx,
                    y: startAttach.y + dy,
                };
            };

            const endTangent = function (dr) {
                const dx = (dr < 0 ? -1 : 1) * Math.sqrt(square(dr) / (1 + square(g2)));
                const dy = g2 * dx;
                return {
                    x: endAttach.x + dx,
                    y: endAttach.y + dy,
                };
            };

            const angleTangent = (angle, dr) => ({
                x: cx + (arcRadius + dr) * Math.sin(angle),
                y: cy - (arcRadius + dr) * Math.cos(angle),
            });

            const endNormal = function (dc) {
                const dx = (dc < 0 ? -1 : 1) * Math.sqrt(square(dc) / (1 + square(1 / g2)));
                const dy = dx / g2;
                return {
                    x: endAttach.x + dx,
                    y: endAttach.y - dy,
                };
            };

            const endOverlayCorner = function (dr, dc) {
                const shoulder = endTangent(dr);
                const arrowTip = endNormal(dc);
                return {
                    x: shoulder.x + arrowTip.x - endAttach.x,
                    y: shoulder.y + arrowTip.y - endAttach.y,
                };
            };

            const coord = point => `${point.x},${point.y}`;

            const shaftRadius = arrowWidth / 2;
            const headRadius = headWidth / 2;
            const positiveSweep = startAttach.y > 0 ? 0 : 1;
            const negativeSweep = startAttach.y < 0 ? 0 : 1;

            this.outline = function (shortCaptionLength) {
                if (startAngle > endAngle) {
                    return [
                        'M',
                        coord(endTangent(-headRadius)),
                        'L',
                        coord(endNormal(headLength)),
                        'L',
                        coord(endTangent(headRadius)),
                        'Z',
                    ].join(' ');
                }

                if (captionLayout === 'external') {
                    let captionSweep = shortCaptionLength / arcRadius;
                    if (this.deflection > 0) {
                        captionSweep *= -1;
                    }

                    const startBreak = midShaftAngle - captionSweep / 2;
                    const endBreak = midShaftAngle + captionSweep / 2;

                    return [
                        'M',
                        coord(startTangent(shaftRadius)),
                        'L',
                        coord(startTangent(-shaftRadius)),
                        'A',
                        arcRadius - shaftRadius,
                        arcRadius - shaftRadius,
                        0,
                        0,
                        positiveSweep,
                        coord(angleTangent(startBreak, -shaftRadius)),
                        'L',
                        coord(angleTangent(startBreak, shaftRadius)),
                        'A',
                        arcRadius + shaftRadius,
                        arcRadius + shaftRadius,
                        0,
                        0,
                        negativeSweep,
                        coord(startTangent(shaftRadius)),
                        'Z',
                        'M',
                        coord(angleTangent(endBreak, shaftRadius)),
                        'L',
                        coord(angleTangent(endBreak, -shaftRadius)),
                        'A',
                        arcRadius - shaftRadius,
                        arcRadius - shaftRadius,
                        0,
                        0,
                        positiveSweep,
                        coord(endTangent(-shaftRadius)),
                        'L',
                        coord(endTangent(-headRadius)),
                        'L',
                        coord(endNormal(headLength)),
                        'L',
                        coord(endTangent(headRadius)),
                        'L',
                        coord(endTangent(shaftRadius)),
                        'A',
                        arcRadius + shaftRadius,
                        arcRadius + shaftRadius,
                        0,
                        0,
                        negativeSweep,
                        coord(angleTangent(endBreak, shaftRadius)),
                    ].join(' ');
                }
                return [
                    'M',
                    coord(startTangent(shaftRadius)),
                    'L',
                    coord(startTangent(-shaftRadius)),
                    'A',
                    arcRadius - shaftRadius,
                    arcRadius - shaftRadius,
                    0,
                    0,
                    positiveSweep,
                    coord(endTangent(-shaftRadius)),
                    'L',
                    coord(endTangent(-headRadius)),
                    'L',
                    coord(endNormal(headLength)),
                    'L',
                    coord(endTangent(headRadius)),
                    'L',
                    coord(endTangent(shaftRadius)),
                    'A',
                    arcRadius + shaftRadius,
                    arcRadius + shaftRadius,
                    0,
                    0,
                    negativeSweep,
                    coord(startTangent(shaftRadius)),
                ].join(' ');
            };

            this.overlay = function (minWidth) {
                const radius = Math.max(minWidth / 2, shaftRadius);

                return [
                    'M',
                    coord(startTangent(radius)),
                    'L',
                    coord(startTangent(-radius)),
                    'A',
                    arcRadius - radius,
                    arcRadius - radius,
                    0,
                    0,
                    positiveSweep,
                    coord(endTangent(-radius)),
                    'L',
                    coord(endOverlayCorner(-radius, headLength)),
                    'L',
                    coord(endOverlayCorner(radius, headLength)),
                    'L',
                    coord(endTangent(radius)),
                    'A',
                    arcRadius + radius,
                    arcRadius + radius,
                    0,
                    0,
                    negativeSweep,
                    coord(startTangent(radius)),
                ].join(' ');
            };
        }
    }

    class StraightArrow {
        constructor(
            startRadius,
            endRadius,
            centreDistance,
            shaftWidth,
            headWidth,
            headHeight,
            captionLayout,
        ) {
            this.length;
            this.midShaftPoint;
            this.outline;
            this.overlay;
            this.shaftLength;
            this.deflection = 0;

            this.length = centreDistance - (startRadius + endRadius);
            this.shaftLength = this.length - headHeight;

            const startArrow = startRadius;
            const endShaft = startArrow + this.shaftLength;
            const endArrow = startArrow + this.length;
            const shaftRadius = shaftWidth / 2;
            const headRadius = headWidth / 2;

            this.midShaftPoint = {
                x: startArrow + this.shaftLength / 2,
                y: 0,
            };

            // for shortCaptionLength we use textBoundingBox = text.node().getComputedTextLength(),
            this.outline = function (shortCaptionLength) {
                if (captionLayout === 'external') {
                    const startBreak = startArrow + (this.shaftLength - shortCaptionLength) / 2;
                    const endBreak = endShaft - (this.shaftLength - shortCaptionLength) / 2;

                    return [
                        'M',
                        startArrow,
                        shaftRadius,
                        'L',
                        startBreak,
                        shaftRadius,
                        'L',
                        startBreak,
                        -shaftRadius,
                        'L',
                        startArrow,
                        -shaftRadius,
                        'Z',
                        'M',
                        endBreak,
                        shaftRadius,
                        'L',
                        endShaft,
                        shaftRadius,
                        'L',
                        endShaft,
                        headRadius,
                        'L',
                        endArrow,
                        0,
                        'L',
                        endShaft,
                        -headRadius,
                        'L',
                        endShaft,
                        -shaftRadius,
                        'L',
                        endBreak,
                        -shaftRadius,
                        'Z',
                    ].join(' ');
                }
                return [
                    'M',
                    startArrow,
                    shaftRadius,
                    'L',
                    endShaft,
                    shaftRadius,
                    'L',
                    endShaft,
                    headRadius,
                    'L',
                    endArrow,
                    0,
                    'L',
                    endShaft,
                    -headRadius,
                    'L',
                    endShaft,
                    -shaftRadius,
                    'L',
                    startArrow,
                    -shaftRadius,
                    'Z',
                ].join(' ');
            };

            this.overlay = function (minWidth) {
                const radius = Math.max(minWidth / 2, shaftRadius);
                return [
                    'M',
                    startArrow,
                    radius,
                    'L',
                    endArrow,
                    radius,
                    'L',
                    endArrow,
                    -radius,
                    'L',
                    startArrow,
                    -radius,
                    'Z',
                ].join(' ');
            };
        }
    }

    class LoopArrow {
        constructor(
            nodeRadius,
            straightLength,
            spreadDegrees,
            shaftWidth,
            headWidth,
            headLength,
            captionHeight,
        ) {
            this.outline;
            this.overlay;
            this.shaftLength;
            this.midShaftPoint;

            const spread = (spreadDegrees * Math.PI) / 180;
            const r1 = nodeRadius;
            const r2 = nodeRadius + headLength;
            const r3 = nodeRadius + straightLength;
            const loopRadius = r3 * Math.tan(spread / 2);
            const shaftRadius = shaftWidth / 2;
            this.shaftLength = loopRadius * 3 + shaftWidth;

            function Point(_x, _y) {
                this.x;
                this.y;

                this.x = _x;
                this.y = _y;
            }

            Point.prototype = {
                toString() {
                    return `${this.x} ${this.y}`;
                },
            };

            const normalPoint = function (sweep, radius, displacement) {
                const localLoopRadius = radius * Math.tan(spread / 2);
                const cy = radius / Math.cos(spread / 2);
                return new Point(
                    (localLoopRadius + displacement) * Math.sin(sweep),
                    cy + (localLoopRadius + displacement) * Math.cos(sweep),
                );
            };

            this.midShaftPoint = normalPoint(
                0,
                r3,
                shaftRadius + captionHeight / 2 + 2,
            );
            const startPoint = (radius, displacement) => normalPoint((Math.PI + spread) / 2, radius, displacement);
            const endPoint = (radius, displacement) => normalPoint(-(Math.PI + spread) / 2, radius, displacement);

            this.outline = function () {
                const inner = loopRadius - shaftRadius;
                const outer = loopRadius + shaftRadius;
                return [
                    'M',
                    startPoint(r1, shaftRadius),
                    'L',
                    startPoint(r3, shaftRadius),
                    'A',
                    outer,
                    outer,
                    0,
                    1,
                    1,
                    endPoint(r3, shaftRadius),
                    'L',
                    endPoint(r2, shaftRadius),
                    'L',
                    endPoint(r2, -headWidth / 2),
                    'L',
                    endPoint(r1, 0),
                    'L',
                    endPoint(r2, headWidth / 2),
                    'L',
                    endPoint(r2, -shaftRadius),
                    'L',
                    endPoint(r3, -shaftRadius),
                    'A',
                    inner,
                    inner,
                    0,
                    1,
                    0,
                    startPoint(r3, -shaftRadius),
                    'L',
                    startPoint(r1, -shaftRadius),
                    'Z',
                ].join(' ');
            };

            this.overlay = function (minWidth) {
                const displacement = Math.max(minWidth / 2, shaftRadius);
                const inner = loopRadius - displacement;
                const outer = loopRadius + displacement;
                return [
                    'M',
                    startPoint(r1, displacement),
                    'L',
                    startPoint(r3, displacement),
                    'A',
                    outer,
                    outer,
                    0,
                    1,
                    1,
                    endPoint(r3, displacement),
                    'L',
                    endPoint(r2, displacement),
                    'L',
                    endPoint(r2, -displacement),
                    'L',
                    endPoint(r3, -displacement),
                    'A',
                    inner,
                    inner,
                    0,
                    1,
                    0,
                    startPoint(r3, -displacement),
                    'L',
                    startPoint(r1, -displacement),
                    'Z',
                ].join(' ');
            };
        }
    }

    /**
     连接线的层级结构
     <g class="relationship">
        <text>{{ relation text }}</text>
        <path class="outline" />
        <path class="overlay" />
     </g>
     */
     
     class RelationShips {
         constructor() {
     
         }
     
         updateRelationships(r, isAttr = false) {
             if (!isAttr) {
                 Array.prototype.push.apply(this.relationships, r);
             } else {
                 this.relationships = Array.prototype.concat.apply([], r);
             }
     
             this.relationship = this.svgRelationships
                 .selectAll('.relationship')
                 .data(this.relationships, d => d.id);
     
             const relationshipEnter = this.appendRelationshipToGraph();
     
             relationshipEnter.relationship.merge(this.relationship);
     
             this.relationshipOutline = this.svg.selectAll('.relationship .outline');
             relationshipEnter.outline.merge(this.relationshipOutline);
     
             this.relationshipOverlay = this.svg.selectAll('.relationship .overlay');
             relationshipEnter.overlay.merge(this.relationshipOverlay);
     
             this.relationshipText = this.svg.selectAll('.relationship .text');
             relationshipEnter.text.merge(this.relationshipText);
     
     
             this.relationship.exit().remove();
             this.relationshipOverlay.exit().remove();
             this.relationshipOutline.exit().remove();
             this.relationshipText.exit().remove();
     
             if (this.relationships.length) {
                 this.relationship = this.svgRelationships.selectAll('.relationship');
                 this.relationshipOutline = this.svg.selectAll('.relationship .outline');
                 this.relationshipOverlay = this.svg.selectAll('.relationship .overlay');
                 this.relationshipText = this.svg.selectAll('.relationship .text');
             } else {
                 this.relationship = undefined;
                 this.relationshipOutline = undefined;
                 this.relationshipOverlay = undefined;
                 this.relationshipText = undefined;
             }
         }
     
         appendRelationshipToGraph() {
             const relationship = this.appendRelationship();
             const text = this.appendTextToRelationship(relationship);
             const outline = this.appendOutlineToRelationship(relationship);
             const overlay = this.appendOverlayToRelationship(relationship);
     
             return {
                 outline,
                 overlay,
                 relationship,
                 text,
             }
         }
     
         appendRelationship() {
             const self = this;
             return this.relationship
                 .enter()
                 .append('g')
                 .attr('class', (d) => {
                     let highlightRelationShip;
                     let i;
                     let classes = 'relationship';
     
                     if (self.options.highlightRelationShip) {
                         for (i = 0; i < self.options.highlightRelationShip.length; i++) {
                             highlightRelationShip = self.options.highlightRelationShip[i];
     
                             if (Number(d.id) === Number(highlightRelationShip.id)) {
                                 classes += ' relationship-highlighted';
                                 classes += (highlightRelationShip.class || '');
                                 break
                             }
                         }
                     }
     
                     return classes
                 })
                 .on('click', function (e) {
                     d3.select(this)
                         .selectAll('.text')
                         .classed('active_text', true);
     
                     e.stopPropagation();
                 })
                 .on('dblclick', (e, d) => {
                     if (typeof self.options.onRelationshipDoubleClick === 'function') {
                         self.options.onRelationshipDoubleClick(d);
                     }
     
                     e.stopPropagation();
                 })
                 .on('mouseenter', () => {
                 })
         }
     
         appendTextToRelationship(r) {
             return r.append('text')
                 .attr('class', 'text')
                 .attr('fill', '#000000')
                 .attr('font-size', '8px')
                 .attr('pointer-events', 'none')
                 .attr('text-anchor', 'middle')
                 .text(d => d.type)
         }
     
         appendOutlineToRelationship(r) {
             return r.append('path')
                 .attr('class', 'outline')
                 .attr('fill', '#a5abb6')
                 .attr('stroke', 'none')
         }
     
         appendOverlayToRelationship(r) {
             return r.append('path')
                 .attr('class', 'overlay')
         }
     
         // 链接线与点
         tickRelationships() {
             this.layoutRelationships();
     
             if (this.relationship) {
                 this.layoutRelationships();
                 this.relationship.attr('transform', d => `translate(${d.source.x} ${d.source.y}) rotate(${
                 d.naturalAngle + 180
             })`);
     
                 this.tickRelationshipsTexts();
                 this.tickRelationshipsOutlines();
                 this.tickRelationshipsOverlays();
             }
         }
     
         tickRelationshipsTexts() {
             this.relationshipText.attr('transform', (rel) => {
                 if (rel.naturalAngle < 90 || rel.naturalAngle > 270) {
                     return `rotate(180 ${rel.arrow.midShaftPoint.x} ${rel.arrow.midShaftPoint.y})`;
                 }
                 return null;
             });
             this.relationshipText.attr('x', rel => rel.arrow.midShaftPoint.x);
             this.relationshipText.attr(
                 'y',
                 // TODO: Make the fontsize and padding dynamic
                 rel => rel.arrow.midShaftPoint.y + parseFloat(8.5) / 2 - 1,
             );
         }
     
         tickRelationshipsOutlines() {
             this.relationship.each(function (relationship) {
                 const rel = d3.select(this);
                 const outline = rel.select('.outline');
                 const text = rel.select('.text');
                 const textPadding = 8;
                 const textLength = text.node().getComputedTextLength();
                 let captionLength = textLength > 0 ? textLength + textPadding : 0;
     
                 outline.attr('d', (d) => {
                     if (captionLength > d.arrow.shaftLength) {
                         captionLength = d.arrow.shaftLength;
                     }
     
                     return d.arrow.outline(captionLength);
                 });
             });
         }
     
         tickRelationshipsOverlays() {
             this.relationshipOverlay.attr('d', d => d.arrow.overlay(this.options.arrowSize));
         }
     
         layoutRelationships() {
             const nodePairs = this.groupedRelationships();
             this.computeGeometryForNonLoopArrows(nodePairs);
             this.distributeAnglesForLoopArrows(nodePairs, this.relationships);
     
             return (() => {
                 const result = [];
                 for (const nodePair of Array.from(nodePairs)) {
                     for (const relationship of Array.from(nodePair.relationships)) {
                         delete relationship.arrow;
                     }
     
                     const middleRelationshipIndex = (nodePair.relationships.length - 1) / 2;
                     // 默认的偏移
                     const defaultDeflectionStep = 30;
                     // 最大的偏移角度
                     const maximumTotalDeflection = 150;
     
                     const numberOfSteps = nodePair.relationships.length - 1;
                     const totalDeflection = defaultDeflectionStep * numberOfSteps;
     
                     const deflectionStep = totalDeflection > maximumTotalDeflection
                         ? maximumTotalDeflection / numberOfSteps
                         : defaultDeflectionStep;
     
                     result.push(
                         // eslint-disable-next-line no-loop-func
                         (() => {
                             for (let i = 0; i < nodePair.relationships.length; i++) {
                                 const relationship = nodePair.relationships[i];
                                 const { nodeRadius } = this.options;
                                 // 线宽
                                 const shaftWidth = this.options.relationshipWidth;
                                 // 箭头宽
                                 const headWidth = this.options.arrowSize;
                                 // 箭头高度
                                 const headHeight = headWidth;
     
                                 if (nodePair.isLoop()) {
                                     relationship.arrow = new LoopArrow(
                                         nodeRadius,
                                         40,
                                         defaultDeflectionStep,
                                         shaftWidth,
                                         headWidth,
                                         headHeight,
                                         relationship.captionHeight || 11,
                                     );
                                 } else if (i === middleRelationshipIndex) {
                                     relationship.arrow = new StraightArrow(
                                         nodeRadius,
                                         nodeRadius,
                                         relationship.centreDistance,
                                         shaftWidth,
                                         headWidth,
                                         headHeight,
                                         relationship.captionLayout || 'external',
                                     );
                                 } else {
                                     let deflection = deflectionStep * (i - middleRelationshipIndex);
     
                                     if (nodePair.nodeA !== relationship.source) {
                                         deflection *= -1;
                                     }
     
                                     relationship.arrow = new ArcArrow(
                                         nodeRadius,
                                         nodeRadius,
                                         relationship.centreDistance,
                                         deflection,
                                         shaftWidth,
                                         headWidth,
                                         headHeight,
                                         relationship.captionLayout || 'external',
                                     );
                                 }
                             }
                         })(),
                     );
                 }
                 return result;
             })();
         }
     
         // 将点和边组合到一起
         groupedRelationships() {
             const groups = {};
             for (const relationship of Array.from(this.relationships)) {
                 let nodePair = new NodePair(relationship.source, relationship.target);
                 // 有相同的nodePair时relationships是做追加的功能
                 nodePair = groups[nodePair] != null ? groups[nodePair] : nodePair;
                 nodePair.relationships.push(relationship);
                 // 注意NodePair的toString方法
                 groups[nodePair] = nodePair;
             }
             return (() => {
                 const result = [];
                 for (const ignored in groups) {
                     const pair = groups[ignored];
                     result.push(pair);
                 }
                 return result;
             })();
         }
     
         // 计算非循环箭头的几何属性 naturalAngle夹角  centreDistance距离
         computeGeometryForNonLoopArrows(nodePairs) {
             const square = distance => distance * distance;
     
             return (() => {
                 const result = [];
                 for (const nodePair of Array.from(nodePairs)) {
                     if (!nodePair.isLoop()) {
                         const dx = nodePair.nodeA.x - nodePair.nodeB.x;
                         const dy = nodePair.nodeA.y - nodePair.nodeB.y;
                         // eslint-disable-next-line vars-on-top
                         const angle = ((Math.atan2(dy, dx) / Math.PI) * 180 + 360) % 360;
                         // eslint-disable-next-line vars-on-top
                         const centreDistance = Math.sqrt(square(dx) + square(dy));
                         result.push(
                             (() => {
                                 const result1 = [];
                                 for (const relationship of Array.from(nodePair.relationships)) {
                                     // 两点之间的夹角
                                     relationship.naturalAngle = relationship.target === nodePair.nodeA
                                         ? (angle + 180) % 360
                                         : angle;
                                     // 两点之间的距离
                                     result1.push((relationship.centreDistance = centreDistance));
                                 }
                                 return result1
                             })(),
                         );
                     } else {
                         result.push(undefined);
                     }
                 }
                 return result
             })();
         }
     
         // 处理循环的箭头的角度问题
         distributeAnglesForLoopArrows(nodePairs, relationships) {
             return (() => {
                 const result = [];
                 for (const nodePair of Array.from(nodePairs)) {
                     if (nodePair.isLoop()) {
                         let i;
                         let separation;
                         let angles = [];
                         const node = nodePair.nodeA;
                         for (const relationship of Array.from(relationships)) {
                             if (!relationship.isLoop()) {
                                 if (relationship.source === node) {
                                     angles.push(relationship.naturalAngle);
                                 }
                                 if (relationship.target === node) {
                                     angles.push(relationship.naturalAngle + 180);
                                 }
                             }
                         }
                         angles = angles.map(a => (a + 360) % 360).sort((a, b) => a - b);
                         if (angles.length > 0) {
                             let end; let
                                 start;
                             const biggestGap = {
                                 start: 0,
                                 end: 0,
                             };
                             for (i = 0; i < angles.length; i++) {
                                 const angle = angles[i];
                                 start = angle;
                                 end = i === angles.length - 1 ? angles[0] + 360 : angles[i + 1];
                                 if (end - start > biggestGap.end - biggestGap.start) {
                                     biggestGap.start = start;
                                     biggestGap.end = end;
                                 }
                             }
                             separation = (biggestGap.end - biggestGap.start) / (nodePair.relationships.length + 1);
                             result.push(
                                 // eslint-disable-next-line no-loop-func
                                 (() => {
                                     const result1 = [];
                                     for (i = 0; i < nodePair.relationships.length; i++) {
                                         const relationship = nodePair.relationships[i];
                                         result1.push(
                                             (relationship.naturalAngle = (biggestGap.start + (i + 1) * separation - 90) % 360),
                                         );
                                     }
                                     return result1
                                 })(),
                             );
                         } else {
                             separation = 360 / nodePair.relationships.length;
     
                             result.push(
                                 // eslint-disable-next-line no-loop-func
                                 (() => {
                                     const result2 = [];
                                     for (i = 0; i < nodePair.relationships.length; i++) {
                                         const relationship = nodePair.relationships[i];
                                         result2.push((relationship.naturalAngle = i * separation));
                                     }
                                     return result2
                                 })(),
                             );
                         }
                     } else {
                         result.push(undefined);
                     }
                 }
                 return result
             })();
         }
     }

    class TextWrap {
        constructor() {

        }

        // 超出两行省略
        wrapEllipsisText(textElement, text, maxWidth, lineHeight, unit = 'em') {
            const words = text ? text.split('').reverse() : [];
            let word;
            const line = [];
            let lineNumber = 0;
            const totalLine = [];

            // eslint-disable-next-line no-cond-assign
            while (word = words.pop()) {
                line.push(word);
                const texttmp = line.join(' ');

                if (this.measureWidth()(texttmp) > maxWidth) {
                    line.pop();
                    lineNumber += 1;
                }
                totalLine.push(word);
                if (lineNumber === 3) {
                    totalLine.splice(-1, 2, '...');
                    break
                }
            }

            const lineTwo = totalLine.join('');
            this.wrapText(textElement, lineTwo, maxWidth, lineHeight, unit, lineNumber);
        }

        calcTextLine(text, maxWidth) {
            const words = text ? text.split('').reverse() : [];
            let word;
            const line = [];
            let lineNumber = 0;

            // eslint-disable-next-line no-cond-assign
            while (word = words.pop()) {
                line.push(word);
                const texttmp = line.join(' ');

                if (this.measureWidth()(texttmp) > maxWidth) {
                    line.pop();
                    lineNumber += 1;
                }
            }

            return lineNumber
        }

        wrapText(textElement, text, maxWidth, lineHeight, unit = 'em', totalLine) {
            // word parameters
            const words = text.split('').reverse();
            let word;
            let line = [];
            let lineNumber = 0;

            // styling parameters
            const x = textElement.attr('x');
            const y = totalLine > 1 ? '0px' : textElement.attr('y');
            if (!lineHeight) lineHeight = 1.1;

            // clear text_elements text
            textElement.text(null);

            // append first tspan element (to fill as we build the lines)
            let tspan = textElement.append('tspan')
                .attr('x', x)
                .attr('y', y)
                .attr('dy', 0);

            // loop through all words and make new lines when we exceed our maxWidth
            // eslint-disable-next-line no-cond-assign
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(''));
                if (this.measureWidth()(tspan.text()) > maxWidth) {
                    line.pop();
                    tspan.text(line.join(' '));
                    line = [word];
                    tspan = textElement.append('tspan')
                        .attr('x', x)
                        .attr('y', y)
                        .attr('dy', `${++lineNumber * lineHeight}${unit}`)
                        .text(word);
                }
            }
        }

        measureWidth() {
            const context = document.createElement('canvas').getContext('2d');
            return text => context.measureText(text).width
        }
    }

    class ToolTips {
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
                .style('top', '0px');
        }

        showToolTips(text) {
            this.tooltips.style('visibility', 'visible')
                .text(text);
        }

        moveToolTips(top, left) {
            this.tooltips.style('top', top)
                .style('left', left);
        }

        hideToolTips() {
            this.tooltips.style('visibility', 'hidden');
        }

        destroyToolsTips() {
            d3.select('#svg-tooltip').remove();
        }
    }

    // 引入scss

    // Neo4jD3
    class Neo4jD3 extends mix(Nodes, NodesPlate, RelationShips, TextWrap, ToolTips) {
        constructor(_selection, _options) {
            super();
            this.options = {
                // 是否显示表盘
                showNodePlate: true,
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
            };
            // 节点
            this.nodes = [];
            // 节点边
            this.relationships = [];
            // 图例
            this.labelLegend = [];

            this.container = undefined;
            this.svg = undefined;
            this.svgRelationships = undefined;
            this.svgNodes = undefined;
            this.imulation = undefined;


            this.node = undefined;
            this.relationship = undefined;
            this.relationshipOutline = undefined;
            this.relationshipOverlay = undefined;
            this.relationshipText = undefined;

            this.classes2colors = {};
            this.numClasses = 0;
            this.info = undefined;
            this.justLoaded = false;
            this.svgScale = undefined;
            this.svgTranslate = undefined;

            this.init(_selection, _options);
        }

        init(_selection, _options) {
            if (!this.options.minCollision) {
                this.options.minCollision = this.options.nodeRadius * 2;
            }
            merge(this.options, _options);

            // 初始化容器
            this.initContainer(_selection);

            // 初始化图的节点
            this.appendGraph();

            // 力学仿真布局
            this.simulation = this.initSimulation();

            // 获取数据
            if (this.options.neo4jData) {
                this.loadNeo4jData(this.options.neo4jData);
            } else if (this.options.neo4jDataUrl) {
                this.loadNeo4jDataFromUrl(this.options.neo4jDataUrl);
            } else {
                // eslint-disable-next-line no-console
                console.error('Error: both neo4jData and neo4jDataUrl are empty!');
            }
        }

        initContainer(_selection) {
            this.container = d3.select(_selection);

            this.container
                .attr('class', 'neo4jd3')
                .html('');
        }

        appendGraph() {
            const self = this;
            this.svg = this.container
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('class', 'neo4jd3-graph')
                .call(d3.zoom().on('zoom', (e) => {
                    let scale = e.transform.k;
                    const translate = [e.transform.x, e.transform.y];

                    if (self.svgTranslate) {
                        translate[0] += self.svgTranslate[0];
                        translate[1] += self.svgTranslate[1];
                    }

                    if (self.svgScale) {
                        scale *= self.svgScale;
                    }

                    self.svg.attr('transform', `translate(${translate[0]}, ${translate[1]}) scale(${scale})`);
                }))
                .on('click', (e) => {
                    // 清楚线的高亮
                    d3.selectAll('.relationship .text')
                        .classed('active_text', false);

                    // 关闭所有的操作表盘
                    d3.selectAll('.context-menu-item')
                        .each(function () {
                            d3.select(this).classed('context-show', false);
                        });
                    e.stopPropagation();
                })
                .on('dblclick.zoom', null)
                .append('g')
                .attr('width', '100%')
                .attr('height', '100%');

            // 链接线 relationShips
            this.svgRelationships = this.svg
                .append('g')
                .attr('class', 'relationships');

            // 实体节点 nodes
            this.svgNodes = this.svg
                .append('g')
                .attr('class', 'nodes');
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
                    this.tick();
                })
                .on('end', () => {
                    if (this.options.zoomFit && !this.justLoaded) {
                        this.justLoaded = true;
                        this.zoomFit(2);
                    }
                });

            return simulation
        }

        // 获取neo4jData
        loadNeo4jData() {
            this.nodes = [];
            this.relationships = [];

            this.updateWithNeo4jData(this.options.neo4jData);
        }

        loadNeo4jDataFromUrl(neo4jDataUrl) {
            const self = this;
            this.nodes = [];
            this.relationships = [];

            d3.json(neo4jDataUrl, (error, data) => {
                if (error) {
                    throw error
                }

                self.updateWithNeo4jData(data);
            });
        }

        // 更新neo4j的数据
        updateWithNeo4jData(neo4jData) {
            const d3Data = this.neo4jDataToD3Data(neo4jData);
            // 进行渲染
            this.updateWithD3Data(d3Data);
        }

        updateWithD3Data(d3Data) {
            this.updateNodesAndRelationships(d3Data.nodes, d3Data.relationships);
        }

        // 渲染nodes 以及 relationships
        updateNodesAndRelationships(n, r) {
            this.updateRelationships(r);
            this.updateNodes(n);

            this.simulation.nodes(this.nodes);
            this.simulation
                .force('link')
                .links(this.relationships);
        }

        // 将neo4j的数据变为D3的数据格式
        // eslint-disable-next-line class-methods-use-this
        neo4jDataToD3Data(res) {
            const graph = {
                nodes: [],
                relationships: [],
            };

            res.results.forEach((result) => {
                result.data.forEach((data) => {
                    data.graph.nodes.forEach((node) => {
                        if (!contains(graph.nodes, node.id)) {
                            graph.nodes.push(node);
                        }
                    });

                    data.graph.relationships.forEach((relationship) => {
                        // 给边增加 source target naturalAngle isLoop 四个属性
                        relationship.source = relationship.startNode;
                        relationship.target = relationship.endNode;
                        relationship.naturalAngle = 0;
                        relationship.isLoop = function () {
                            return this.source === this.target
                        };
                        graph.relationships.push(relationship);
                    });

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
                    });
                });
            });

            return graph
        }

        tick() {
            this.tickNodes();
            // 将点和线链接起来
            this.tickRelationships();
        }

        zoomFit() {
            const bounds = this.svg.node().getBBox();
            const parent = this.svg.node().parentElement.parentElement;
            const fullWidth = parent.clientWidth;
            const fullHeight = parent.clientHeight;
            const { width } = bounds;
            const { height } = bounds;
            const midX = bounds.x + width / 2;
            const midY = bounds.y + height / 2;

            if (width === 0 || height === 0) {
                return // nothing to fit
            }

            this.svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
            this.svgTranslate = [
                fullWidth / 2 - this.svgScale * midX,
                fullHeight / 2 - this.svgScale * midY,
            ];

            this.svg.attr('transform', `translate(${this.svgTranslate[0]}, ${this.svgTranslate[1]}) scale(${this.svgScale})`);
            // smoothTransform(svgTranslate, svgScale);
        }

        size() {
            return {
                nodes: this.nodes.length,
                relationships: this.relationships.length,
            }
        }
    }

    return Neo4jD3;

}));

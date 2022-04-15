/**
 连接线的层级结构
 <g class="relationship">
    <text>{{ relation text }}</text>
    <path class="outline" />
    <path class="overlay" />
 </g>
 */
 import NodePair from '../util/nodePair'
 import ArcArrow from '../util/arcArrow'
 import StraightArrow from '../util/straightArrow'
 import LoopArrow from '../util/loopArrow'
 
 export default class RelationShips {
     constructor() {
 
     }
 
     updateRelationships(r, isAttr = false) {
         if (!isAttr) {
             Array.prototype.push.apply(this.relationships, r)
         } else {
             this.relationships = Array.prototype.concat.apply([], r)
         }
 
         this.relationship = this.svgRelationships
             .selectAll('.relationship')
             .data(this.relationships, d => d.id)
 
         const relationshipEnter = this.appendRelationshipToGraph()
 
         relationshipEnter.relationship.merge(this.relationship)
 
         this.relationshipOutline = this.svg.selectAll('.relationship .outline')
         relationshipEnter.outline.merge(this.relationshipOutline)
 
         this.relationshipOverlay = this.svg.selectAll('.relationship .overlay')
         relationshipEnter.overlay.merge(this.relationshipOverlay)
 
         this.relationshipText = this.svg.selectAll('.relationship .text')
         relationshipEnter.text.merge(this.relationshipText)
 
 
         this.relationship.exit().remove()
         this.relationshipOverlay.exit().remove()
         this.relationshipOutline.exit().remove()
         this.relationshipText.exit().remove()
 
         if (this.relationships.length) {
             this.relationship = this.svgRelationships.selectAll('.relationship')
             this.relationshipOutline = this.svg.selectAll('.relationship .outline')
             this.relationshipOverlay = this.svg.selectAll('.relationship .overlay')
             this.relationshipText = this.svg.selectAll('.relationship .text')
         } else {
             this.relationship = undefined
             this.relationshipOutline = undefined
             this.relationshipOverlay = undefined
             this.relationshipText = undefined
         }
     }
 
     appendRelationshipToGraph() {
         const relationship = this.appendRelationship()
         const text = this.appendTextToRelationship(relationship)
         const outline = this.appendOutlineToRelationship(relationship)
         const overlay = this.appendOverlayToRelationship(relationship)
 
         return {
             outline,
             overlay,
             relationship,
             text,
         }
     }
 
     appendRelationship() {
         const self = this
         return this.relationship
             .enter()
             .append('g')
             .attr('class', (d) => {
                 let highlightRelationShip
                 let i
                 let classes = 'relationship'
 
                 if (self.options.highlightRelationShip) {
                     for (i = 0; i < self.options.highlightRelationShip.length; i++) {
                         highlightRelationShip = self.options.highlightRelationShip[i]
 
                         if (Number(d.id) === Number(highlightRelationShip.id)) {
                             classes += ' relationship-highlighted'
                             classes += (highlightRelationShip.class || '')
                             break
                         }
                     }
                 }
 
                 return classes
             })
             .on('click', function (e) {
                 d3.select(this)
                     .selectAll('.text')
                     .classed('active_text', true)
 
                 e.stopPropagation()
             })
             .on('dblclick', (e, d) => {
                 if (typeof self.options.onRelationshipDoubleClick === 'function') {
                     self.options.onRelationshipDoubleClick(d)
                 }
 
                 e.stopPropagation()
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
         this.layoutRelationships()
 
         if (this.relationship) {
             this.layoutRelationships()
             this.relationship.attr('transform', d => `translate(${d.source.x} ${d.source.y}) rotate(${
                 d.naturalAngle + 180
             })`);
 
             this.tickRelationshipsTexts()
             this.tickRelationshipsOutlines()
             this.tickRelationshipsOverlays()
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
         const nodePairs = this.groupedRelationships()
         this.computeGeometryForNonLoopArrows(nodePairs)
         this.distributeAnglesForLoopArrows(nodePairs, this.relationships)
 
         return (() => {
             const result = []
             for (const nodePair of Array.from(nodePairs)) {
                 for (const relationship of Array.from(nodePair.relationships)) {
                     delete relationship.arrow
                 }
 
                 const middleRelationshipIndex = (nodePair.relationships.length - 1) / 2
                 // 默认的偏移
                 const defaultDeflectionStep = 30
                 // 最大的偏移角度
                 const maximumTotalDeflection = 150
 
                 const numberOfSteps = nodePair.relationships.length - 1
                 const totalDeflection = defaultDeflectionStep * numberOfSteps
 
                 const deflectionStep = totalDeflection > maximumTotalDeflection
                     ? maximumTotalDeflection / numberOfSteps
                     : defaultDeflectionStep
 
                 result.push(
                     // eslint-disable-next-line no-loop-func
                     (() => {
                         for (let i = 0; i < nodePair.relationships.length; i++) {
                             let ref
                             const relationship = nodePair.relationships[i]
                             const { nodeRadius } = this.options
                             // 线宽
                             const shaftWidth = this.options.relationshipWidth
                             // 箭头宽
                             const headWidth = this.options.arrowSize
                             // 箭头高度
                             const headHeight = headWidth
 
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
         const square = distance => distance * distance
 
         return (() => {
             const result = [];
             for (const nodePair of Array.from(nodePairs)) {
                 if (!nodePair.isLoop()) {
                     const dx = nodePair.nodeA.x - nodePair.nodeB.x
                     const dy = nodePair.nodeA.y - nodePair.nodeB.y
                     // eslint-disable-next-line vars-on-top
                     const angle = ((Math.atan2(dy, dx) / Math.PI) * 180 + 360) % 360
                     // eslint-disable-next-line vars-on-top
                     const centreDistance = Math.sqrt(square(dx) + square(dy));
                     result.push(
                         (() => {
                             const result1 = [];
                             for (const relationship of Array.from(nodePair.relationships)) {
                                 // 两点之间的夹角
                                 relationship.naturalAngle = relationship.target === nodePair.nodeA
                                     ? (angle + 180) % 360
                                     : angle
                                 // 两点之间的距离
                                 result1.push((relationship.centreDistance = centreDistance))
                             }
                             return result1
                         })(),
                     );
                 } else {
                     result.push(undefined)
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
                     let i
                     let separation
                     let angles = []
                     const node = nodePair.nodeA
                     for (const relationship of Array.from(relationships)) {
                         if (!relationship.isLoop()) {
                             if (relationship.source === node) {
                                 angles.push(relationship.naturalAngle)
                             }
                             if (relationship.target === node) {
                                 angles.push(relationship.naturalAngle + 180)
                             }
                         }
                     }
                     angles = angles.map(a => (a + 360) % 360).sort((a, b) => a - b)
                     if (angles.length > 0) {
                         let end; let
                             start
                         const biggestGap = {
                             start: 0,
                             end: 0,
                         };
                         for (i = 0; i < angles.length; i++) {
                             const angle = angles[i]
                             start = angle
                             end = i === angles.length - 1 ? angles[0] + 360 : angles[i + 1]
                             if (end - start > biggestGap.end - biggestGap.start) {
                                 biggestGap.start = start
                                 biggestGap.end = end
                             }
                         }
                         separation = (biggestGap.end - biggestGap.start) / (nodePair.relationships.length + 1)
                         result.push(
                             // eslint-disable-next-line no-loop-func
                             (() => {
                                 const result1 = []
                                 for (i = 0; i < nodePair.relationships.length; i++) {
                                     const relationship = nodePair.relationships[i]
                                     result1.push(
                                         (relationship.naturalAngle = (biggestGap.start + (i + 1) * separation - 90) % 360),
                                     );
                                 }
                                 return result1
                             })(),
                         );
                     } else {
                         separation = 360 / nodePair.relationships.length
 
                         result.push(
                             // eslint-disable-next-line no-loop-func
                             (() => {
                                 const result2 = [];
                                 for (i = 0; i < nodePair.relationships.length; i++) {
                                     const relationship = nodePair.relationships[i]
                                     result2.push((relationship.naturalAngle = i * separation))
                                 }
                                 return result2
                             })(),
                         );
                     }
                 } else {
                     result.push(undefined)
                 }
             }
             return result
         })();
     }
 }
export default class NodePair {
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
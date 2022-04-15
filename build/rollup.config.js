// rollup.config.js
import scss from 'rollup-plugin-scss'
import { terser } from "rollup-plugin-terser";


const plugins = [
    scss()
]
let file = './dist/neo4jd3.js'

if (process.env.NODE_ENV === 'production') {
    plugins.push(terser())
    file = './dist/neo4jd3.min.js'
} 

export default {
    // 核心选项
    input: './src/index.js',     // 必须
    output: {
        file,
        format: 'umd',
        name: 'Neo4jd3',
    },
    plugins
};
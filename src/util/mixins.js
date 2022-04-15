// mix-in 将多个类混入进一个类

function copyProperties(target, source) {
    // eslint-disable-next-line no-restricted-syntax
    for (const key of Reflect.ownKeys(source)) {
        if (key !== 'constructor'
      && key !== 'prototype'
      && key !== 'name'
        ) {
            const desc = Object.getOwnPropertyDescriptor(source, key)
            Object.defineProperty(target, key, desc)
        }
    }
}

export default function mix(...mixins) {
    class Mix {
        constructor() {
            // eslint-disable-next-line no-restricted-syntax
            for (const mixin of mixins) {
                // eslint-disable-next-line new-cap
                copyProperties(this, new mixin()) // 拷贝实例属性
            }
        }
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const mixin of mixins) {
        copyProperties(Mix, mixin) // 拷贝静态属性
        copyProperties(Mix.prototype, mixin.prototype) // 拷贝原型属性
    }

    return Mix
}
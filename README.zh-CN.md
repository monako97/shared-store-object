# Shared Store Object

[![version][version-tag]][npm-url]
[![install size][size-tag]][size-url]
[![download][download-tag]][npm-url]
[![sso][install-tag]][npm-url]

[npm-url]: https://npmjs.org/package/shared-store-object
[install-tag]: https://nodei.co/npm/shared-store-object.png
[version-tag]: https://img.shields.io/npm/v/shared-store-object/latest.svg?logo=npm
[size-tag]: https://packagephobia.com/badge?p=shared-store-object@latest
[size-url]: https://packagephobia.com/result?p=shared-store-object@latest
[download-tag]: https://img.shields.io/npm/dm/shared-store-object.svg?logo=docusign

[English](README.md) · 简体中文

## 安装依赖

```shell
npm install shared-store-object -S
# or
yarn add shared-store-object -S
```

## 使用

```js
import sso from 'shared-store-object';

// 创建
const like = sso(
  // 属性
  { count: 0 },
  // 计算属性 [只读]
  {
    age() {
      return like.count * 2;
    },
  }
);

// 使用
console.log(like.count); // 0
console.log(like.age); // 0
// 直接修改
like.count++;
console.log(like.count); // 1
console.log(like.age); // 1
// 函数函数修改
like('count', (prev) => prev + 1);
console.log(like.count); // 2
console.log(like.age); // 4
// 回收对象
like();
```

## 配置项

### 全局配置

```js
import sso from 'shared-store-object';

// 当使用 React < 18 时，使用全局配置进行批量更新。
sso.config({ next: ReactDOM.unstable_batchedUpdates });
```

### 单独为一个对象启用配置

```js
import sso from 'shared-store-object';

const app = sso({
  count: 0,
});

app((): Partial<SSOConfig> => {
  return {
    next(iteration, key, data) {
      console.log('app', key, data);
      iteration();
    },
  };
});
```

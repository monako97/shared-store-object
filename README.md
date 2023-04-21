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

English · [简体中文](README.zh-CN.md)

## Install

```shell
npm install shared-store-object -S
# or
yarn add shared-store-object -S
```

## Use

```js
// create
const like = sso(
  // property
  { count: 0 },
  // computed property [readonly]
  {
    age() {
      return like.count * 2;
    },
  }
);
// use
console.log(like.count); // 0
console.log(like.age); // 0 
// modify
like.count++;
console.log(like.count); // 1
console.log(like.age); // 1 
// modify using a functional approach.
like('count', (prev) => prev + 1);
console.log(like.count); // 2
console.log(like.age); // 4
// revoke
like();
//
```

## Configuration

### Global configuration

```js
// when using React < 18, use batch updates to configure globally.
sso.config({ next: ReactDOM.unstable_batchedUpdates });
```

### Separate configuration

```js
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

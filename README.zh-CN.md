# Shared Store Object

[English](./README.md) · 简体中文

```js
// 创建
const like = sso({ count: 0 });

// 使用
console.log(like.count); // 0
// 直接修改
like.count++;
console.log(like.count); // 1
// 函数函数修改
like('count', (prev) => prev + 1);
console.log(like.count); // 2
// 回收对象
like();
```

## 配置项

### 全局配置

```js
// 当使用 React < 18 时，使用全局配置进行批量更新。
sso.config({ next: ReactDOM.unstable_batchedUpdates });
```

### 单独为一个对象启用配置

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

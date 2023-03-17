# shared-store-object

```js
// 创建状态
const store = sso({ count: 0 });
// 使用
console.log(store.count); // 0
// 修改
store.count++;
console.log(store.count); // 1
```

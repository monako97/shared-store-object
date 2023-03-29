# Shared Store Object

English · [简体中文](./README.zh-CN.md)

```js
// create
const like = sso({ count: 0 });
// use
console.log(like.count); // 0
// modify
like.count++;
console.log(like.count); // 1
// modify using a functional approach.
like('count', (prev) => prev + 1)
console.log(like.count); // 2
// revoke
like()
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

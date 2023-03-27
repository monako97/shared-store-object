import { useSyncExternalStore } from 'use-sync-external-store/shim';

// eslint-disable-next-line no-unused-vars
type ArgumentsVoid = <T>(...args: T[]) => T;
// eslint-disable-next-line no-unused-vars
type Updater<V> = (val: V) => V;
// eslint-disable-next-line no-unused-vars
type Setter<T> = <K extends keyof T>(key: K, updater: Updater<T[K]>) => void;
type SSO<T> = T & Setter<T> & VoidFunction;
type Methods<T> = Record<keyof T, ArgumentsVoid>;
type Data = Record<string | symbol, unknown>;
type State<T> = {
  [K in keyof T]: {
    getSnapshot: () => T[K];
    useSnapshot: () => T[K];
    // eslint-disable-next-line no-unused-vars
    setSnapshot: (val: T[K]) => void;
    // eslint-disable-next-line no-unused-vars
    subscribe: (listener: VoidFunction) => VoidFunction;
  };
};
interface SSOConfig {
  /** 在这里可以看到是哪段数据中的哪个属性发生了变化, 并判断是否需要进行迭代 */
  next: typeof run;
}
let isInMethod = false;
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
let run = function <T extends Data>(update: VoidFunction, _key: keyof T, _data: T) {
  update();
};

/** 创建共享存储对象 Shared Store Object
 * @param {Data} data data
 * @returns {SSO} store
 * @example
 * // react < 18 时使用批量更新
 * sso.config({ next: ReactDOM.unstable_batchedUpdates });
 * // 创建对象
 * const store = sso({ count: 0 });
 * // 使用
 * console.log(store.count); // 0
 * // 修改
 * store.count++;
 * console.log(store.count); // 1
 * store('count', (prev) => prev + 1)
 * console.log(store.count); // 2
 * // 回收对象
 * store()
 */
function sso<T extends Data>(data: T): SSO<T> {
  if (Object.prototype.toString.call(data) !== '[object Object]') {
    throw new Error('The input parameter must be an Object.');
  }
  const state: State<T> = Object.create(null) as State<T>;
  const methods: Methods<T> = Object.create(null) as Methods<T>;
  const keys: (keyof T)[] = Object.keys(data);

  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    const initVal = data[key];

    if (initVal instanceof Function) {
      methods[key] = function (...args) {
        isInMethod = true;
        const res = initVal(...args);

        isInMethod = false;
        return res;
      };
    } else {
      const listeners = new Set<VoidFunction>();

      state[key] = {
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        getSnapshot() {
          return data[key];
        },
        setSnapshot(val) {
          if (val !== data[key]) {
            data[key] = val;
            run(
              function () {
                for (const listener of listeners.values()) {
                  listener();
                }
              },
              key,
              data
            );
          }
        },
        useSnapshot() {
          return useSyncExternalStore(
            state[key].subscribe,
            state[key].getSnapshot,
            state[key].getSnapshot
          );
        },
      };
    }
  }
  function setState(key: keyof T, val: T[keyof T] | Updater<T[keyof T]>) {
    if (key in data) {
      if (key in state) {
        state[key].setSnapshot(val instanceof Function ? val(data[key]) : val);
      } else {
        throw new Error(`"${String(key)}" is a method and cannot be updated.`);
      }
    } else {
      throw new Error(`"${String(key)}" has not been initialized in the store.`);
    }
  }
  // eslint-disable-next-line no-undefined
  const store = Proxy.revocable((() => undefined) as SSO<T>, {
    get(_, key: keyof T) {
      if (key in methods) {
        return methods[key];
      }
      if (isInMethod) {
        return data[key];
      }
      try {
        return state[key].useSnapshot();
      } catch (err) {
        return data[key];
      }
    },
    set(target, key: keyof T, val: T[keyof T]) {
      setState(key, val);
      return true;
    },
    apply(_, __, [key, updater]: [keyof T, Updater<T[keyof T]>]) {
      if (typeof key === 'undefined') {
        store.revoke();
      } else if (typeof updater === 'function') {
        setState(key, updater);
      } else {
        throw new Error(`The update program for "${String(key)}" should be a function.`);
      }
    },
  });

  return store.proxy;
}

sso.config = ({ next }: SSOConfig) => {
  run = next;
};

export default sso;

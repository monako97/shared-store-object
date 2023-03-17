import { useSyncExternalStore } from 'use-sync-external-store/shim';

type VoidFn = () => void;
// eslint-disable-next-line no-unused-vars
type AnyFn = (...args: unknown[]) => unknown;
// eslint-disable-next-line no-unused-vars
type Updater<V> = (val: V) => V;

type Data = Record<string, unknown>;
type State<T> = {
  [K in keyof T]: {
    // eslint-disable-next-line no-unused-vars
    subscribe: (listener: VoidFn) => VoidFn;
    getSnapshot: () => T[K];
    useSnapshot: () => T[K];
    // eslint-disable-next-line no-unused-vars
    setSnapshot: (val: T[K]) => void;
  };
};
type Methods<T> = Record<keyof T, AnyFn>;
// eslint-disable-next-line no-unused-vars
type Setter<T> = <K extends keyof T>(key: K, updater: Updater<T[K]>) => void;
type Store<T> = T & Setter<T>;

let isInMethod = false;
let run = (fn: VoidFn) => {
  fn();
};

/** 创建共享存储对象 Shared Store Object
 * @param {any} data data
 * @returns {Store} store
 * @example
 * // 创建状态
 * const store = sso({ count: 0 });
 * // 使用
 * console.log(store.count); // 0
 * // 修改
 * store.count++;
 * console.log(store.count); // 1
 */
const sso = <T extends Data>(data: T): Store<T> => {
  if (Object.prototype.toString.call(data) !== '[object Object]') {
    throw new Error('object required');
  }
  const state: State<T> = Object.create(null) as State<T>;
  const methods: Methods<T> = Object.create(null) as Methods<T>;
  const keys: (keyof T)[] = Object.keys(data);

  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    const initVal = data[key];

    if (initVal instanceof Function) {
      methods[key] = (...args: unknown[]) => {
        isInMethod = true;
        const res = initVal(...args);

        isInMethod = false;
        return res;
      };
    } else {
      const listeners = new Set<VoidFn>();

      state[key] = {
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        getSnapshot: () => data[key],
        setSnapshot: (val) => {
          if (val !== data[key]) {
            data[key] = val;
            run(() => listeners.forEach((listener) => listener()));
          }
        },
        useSnapshot: () => {
          return useSyncExternalStore(
            state[key].subscribe,
            state[key].getSnapshot,
            state[key].getSnapshot
          );
        },
      };
    }
  }
  const setState = (key: keyof T, val: T[keyof T] | Updater<T[keyof T]>) => {
    if (key in data) {
      if (key in state) {
        const newVal = val instanceof Function ? val(data[key]) : val;

        state[key].setSnapshot(newVal);
      } else {
        throw new Error(`\`${key as string}\` is a method, can not update`);
      }
    } else {
      throw new Error(`\`${key as string}\` is not initialized in store`);
    }
  };

  return new Proxy(
    // eslint-disable-next-line no-undefined
    (() => undefined) as unknown as Store<T>,
    {
      get: (_, key: keyof T) => {
        if (key in methods) {
          return methods[key];
        } else if (isInMethod) {
          return data[key];
        }
        try {
          return state[key].useSnapshot();
        } catch (err) {
          return data[key];
        }
      },
      set: (_, key: keyof T, val: T[keyof T]) => {
        setState(key, val);
        return true;
      },
      apply: (_, __, [key, updater]: [keyof T, Updater<T[keyof T]>]) => {
        if (typeof updater === 'function') {
          setState(key, updater);
        } else {
          throw new Error(`updater for \`${key as string}\` should be a function`);
        }
      },
    } as ProxyHandler<Store<T>>
  );
};

sso.config = ({ batch }: { batch: typeof run }) => {
  run = batch;
};

export default sso;

import { useSyncExternalStore } from 'use-sync-external-store/shim';

// eslint-disable-next-line no-unused-vars
type ArgumentsVoid = <T>(...args: T[]) => T;
// eslint-disable-next-line no-unused-vars
type Updater<V> = (val: V) => V;
// eslint-disable-next-line no-unused-vars
type Setter<T> = <K extends keyof T>(key: K, updater: Updater<T[K]>) => void;

/**
 * private configuration
 * @returns {Partial<SSOConfig>} override configuration
 */
// eslint-disable-next-line no-unused-vars
export type PrivateSSOConfig = (args?: unknown) => Partial<SSOConfig>;
type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends VoidFunction ? never : K;
}[keyof T];
type FunctionProperties<T> = {
  [K in keyof T]: T[K] extends VoidFunction ? K : never;
}[keyof T];
type DisallowCommonKeys<T, U> = Record<keyof T & keyof U, never>;

export type SSO<T, C> = Pick<T, NonFunctionPropertyNames<T>> &
  Readonly<Pick<T, FunctionProperties<T>>> &
  Readonly<C> &
  Setter<Pick<T, NonFunctionPropertyNames<T>>> &
  PrivateSSOConfig &
  VoidFunction;
type Methods<T> = Record<keyof T, ArgumentsVoid>;
type Data = Record<string | symbol, unknown>;
type Compute<C = unknown> = Record<keyof C, () => unknown>;
type RecordWithReturn<O extends Compute> = {
  [K in keyof O]: O[K] extends VoidFunction ? ReturnType<O[K]> : unknown;
};
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
/** SSO configuration */
export interface SSOConfig {
  /**
   * iteration function
   * @template T - object type
   * @description Here, you can see which property in the data has changed and determine whether iteration is necessary.
   * @param {VoidFunction} iteration - data object iteration method.
   * @param {keyof T} key - name of the property that was modified in the data object.
   * @param {T} data - the modified data object contains multiple properties.
   * @returns {void}
   */
  // eslint-disable-next-line no-unused-vars
  next: <T extends Data>(iteration: VoidFunction, key: keyof T, data: T) => void;
}
function isFunction(target: unknown): target is VoidFunction | ArgumentsVoid {
  return target instanceof Function;
}
function isObject(target: unknown): target is object {
  const type = typeof target;

  return target !== null && (type == 'object' || type == 'function');
}

/**
 * 检查数组是否相等
 * @param {A1} one 第一个数组
 * @param {B1} arr2 第二个数组
 * @return {Boolean} 如果它们的值相等,则返回true
 */
function arrayEqual<A extends [], B extends []>(one: A, arr2: B): boolean {
  // 检查长度
  if (one.length !== arr2.length) {
    return false;
  }
  // 检查数组中的每一项
  for (let i = 0, len = one.length; i < len; i++) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    if (!isEqual(one[i], arr2[i])) {
      return false;
    }
  }
  return true;
}
function objectEqual<A extends object, B extends object>(val1: A, val2: B): boolean {
  const keys = Object.keys(val1);

  if (keys.length !== Object.keys(val2).length) {
    return false;
  }
  // 检查对象中的每个项目
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i] as keyof A & keyof B;

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    if (!isEqual(val1[key], val2[key])) {
      return false;
    }
  }
  return true;
}
/**
 * 检查两个对象或数组是否相等
 * @param {*} obj1 第一个对象
 * @param {*} obj2 第二个对象
 * @return {Boolean} 如果它们的值相等,则返回true
 */
function isEqual<A, B>(obj1: A, obj2: B): boolean {
  // 获取对象类型
  const type = Object.prototype.toString.call(obj1);

  // 如果两个项目不是同一类型，则返回 false
  if (type !== Object.prototype.toString.call(obj2)) {
    return false;
  }
  // 根据类型比较
  if (type === '[object Array]') {
    return arrayEqual(obj1 as [], obj2 as []);
  } else if (type === '[object Object]') {
    return objectEqual(obj1 as object, obj2 as object);
  } else if (
    [
      '[object Function]',
      '[object AsyncFunction]',
      '[object GeneratorFunction]',
      '[object Proxy]',
    ].includes(type)
  ) {
    return (obj1 as VoidFunction).toString() === (obj2 as VoidFunction).toString();
  }
  return (obj1 as string) === (obj2 as string);
}

let isInMethod = false;
const globalConfig: SSOConfig = {
  next(iteration) {
    iteration();
  },
};

/** validateConfiguration
 * @param {Partial<SSOConfig>} config configuration
 * @returns {void}
 */
function validateConfiguration(config: Partial<SSOConfig>): void {
  if (!isObject(config)) {
    throw new Error('Illegal configuration.');
  }
  for (
    let i = 0, g = Object.keys(globalConfig), c = Object.keys(config), cl = c.length;
    i < cl;
    i++
  ) {
    const key = c[i] as keyof SSOConfig;

    if (g.includes(key)) {
      const type = typeof globalConfig[key],
        inputType = typeof config[key];

      if (type !== inputType) {
        throw new Error(`${key} does not support ${inputType} type, it should be a ${type}.`);
      }
    } else {
      throw new Error(`The "${key}" configuration item is currently not supported.`);
    }
  }
}

/** Shared Store Object
 * @description create a shared store object
 * @param {Data} property property
 * @param {Compute} computedProperty computed property
 * @returns {SSO} object
 * @example
 * // when using React < 18, use batch updates to configure globally.
 * sso.config({ next: ReactDOM.unstable_batchedUpdates });
 * // create
 * const like = sso({ count: 0 });
 * // use
 * console.log(like.count); // 0
 * // modify
 * like.count++;
 * console.log(like.count); // 1
 * // modify using a functional approach.
 * like('count', (prev) => prev + 1)
 * console.log(like.count); // 2
 * // revoke
 * like()
 */
function sso<T extends Data, C extends Compute>(
  property: T,
  computedProperty?: C & DisallowCommonKeys<C, T> & Record<keyof C, VoidFunction>
): SSO<T, RecordWithReturn<C>> {
  if (!isObject(property)) {
    throw new Error('The input parameter must be an Object.');
  }
  const config = { ...globalConfig };
  const state = Object.create(null) as State<T>;
  const methods = Object.create(null) as Methods<T>;

  for (let i = 0, keys = Object.keys(property) as (keyof T)[], len = keys.length; i < len; i++) {
    const key = keys[i];
    const initVal = property[key];

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
        subscribe(iterable) {
          listeners.add(iterable);
          return () => listeners.delete(iterable);
        },
        getSnapshot() {
          return property[key];
        },
        setSnapshot(val) {
          if (!isEqual(val, property[key])) {
            property[key] = val;
            config.next(
              function () {
                for (const iteration of listeners.values()) {
                  iteration();
                }
              },
              key,
              property
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
    if (computedProperty && key in computedProperty) {
      throw new Error(`"${String(key)}" is a Computed property and cannot be updated.`);
    }
    if (key in property) {
      if (key in state) {
        state[key].setSnapshot(val instanceof Function ? val(property[key]) : val);
      } else {
        throw new Error(`"${String(key)}" is a method and cannot be updated.`);
      }
    } else {
      throw new Error(`"${String(key)}" has not been initialized in the store.`);
    }
  }
  const store = Proxy.revocable(Function() as SSO<T, RecordWithReturn<C>>, {
    get<K extends keyof T & keyof C & string & symbol>(_: SSO<T, RecordWithReturn<C>>, key: K) {
      if (computedProperty && key in computedProperty) {
        return (computedProperty as Compute<C>)[key]();
      }
      if (key in methods) {
        return methods[key];
      }
      if (isInMethod) {
        return property[key];
      }
      try {
        return state[key].useSnapshot();
      } catch (err) {
        return property[key];
      }
    },
    set(_, key: keyof T, val: T[keyof T]) {
      setState(key, val);
      return true;
    },
    apply(_, __, [prop, updater]: [keyof T | PrivateSSOConfig, Updater<T[keyof T]>]) {
      if (typeof prop === 'undefined') {
        store.revoke();
      } else if (isFunction(prop)) {
        const override = prop();

        validateConfiguration(override);
        Object.assign(config, override);
      } else if (isFunction(updater)) {
        setState(prop, updater);
      } else {
        throw new Error(`The update program for "${String(prop)}" should be a function.`);
      }
    },
  });

  return store.proxy;
}

/**
 * SSO global configuration
 * @param {Partial<SSOConfig>} config - configuration
 * @returns {void}
 */
sso.config = function (config: Partial<SSOConfig>): void {
  validateConfiguration(config);
  Object.assign(globalConfig, config);
};

export default sso;

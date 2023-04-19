import isEqual from '@moneko/common/lib/isEqual';
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
type SSO<T> = T & Setter<T> & PrivateSSOConfig & VoidFunction;
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
/** SSO configuration */
export interface SSOConfig {
  /**
   * iteration function
   * @template T - object type
   * @description Here, you can see which property in the data has changed and determine whether iteration is necessary.
   * @param {VoidFunction} iteration - data object iteration method.
   * @param {keyof T} _key - name of the property that was modified in the data object.
   * @param {T} _data - the modified data object contains multiple properties.
   * @returns {void}
   */
  // eslint-disable-next-line no-unused-vars
  next: <T extends Data>(iteration: VoidFunction, _key: keyof T, _data: T) => void;
}

let isInMethod = false;
const globalConfig: SSOConfig = {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  next(iteration, _key, _data) {
    iteration();
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(target: any): target is object {
  const type = typeof target;

  return target !== null && (type == 'object' || type == 'function');
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isFunction(target: any): target is VoidFunction {
  return [
    '[object Function]',
    '[object AsyncFunction]',
    '[object GeneratorFunction]',
    '[object Proxy]',
  ].includes(Object.prototype.toString.call(target));
}

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
 * @param {Data} data data
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
function sso<T extends Data>(data: T): SSO<T> {
  if (!isObject(data)) {
    throw new Error('The input parameter must be an Object.');
  }
  const config = { ...globalConfig };
  const state = Object.create(null) as State<T>;
  const methods = Object.create(null) as Methods<T>;

  for (let i = 0, keys = Object.keys(data) as (keyof T)[], len = keys.length; i < len; i++) {
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
        subscribe(iterable) {
          listeners.add(iterable);
          return () => listeners.delete(iterable);
        },
        getSnapshot() {
          return data[key];
        },
        setSnapshot(val) {
          if (!isEqual(val, data[key])) {
            data[key] = val;
            config.next(
              function () {
                for (const iteration of listeners.values()) {
                  iteration();
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

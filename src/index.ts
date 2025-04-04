import { isEqual, isFunction, isObject } from '@moneko/common';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

type ArgumentsVoid = <T>(...args: T[]) => T;
type Updater<V> = (val: V) => V;
type Setter<T> = <K extends keyof T>(key: K, updater: Updater<T[K]>) => void;

/**
 * private configuration
 * @returns {Partial<SSOConfig>} override configuration
 */
export type PrivateSSOConfig = (args?: unknown) => Partial<SSOConfig>;
type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];
type FunctionProperties<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
// type BindFunctionThis<T, S> = {
//   [K in keyof T]: T[K] extends (...args: any[]) => any
//   ? (this: S, ...args: Parameters<T[K]>) => ReturnType<T[K]>
//   : T[K]
// };
// type BindComputedThis<C extends Record<any, (...args: any[]) => unknown>, T> = {
//   [K in keyof C]: (this: T) => ReturnType<C[K]>
// };
type DisallowCommonKeys<T, U> = Record<keyof T & keyof U, never>;

export type SSO<T, C = Compute> = Pick<T, NonFunctionPropertyNames<T>> &
  Readonly<Pick<T, FunctionProperties<T>>> &
  Readonly<C> &
  Setter<Pick<T, NonFunctionPropertyNames<T>>> &
  PrivateSSOConfig &
  VoidFunction;
type Data = Record<string | symbol, unknown>;
type Compute<C = unknown, S = unknown> = Record<keyof C, (this: S) => unknown>;
type RecordWithReturn<O extends Compute> = {
  [K in keyof O]: O[K] extends VoidFunction ? ReturnType<O[K]> : unknown;
};
type State<T> = {
  [K in keyof T]: {
    getSnapshot: () => T[K];
    useSnapshot: () => T[K];
    setSnapshot: (val: T[K]) => void;
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
  next: <T extends Data>(iteration: VoidFunction, key: keyof T, data: T) => void;
}

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
function sso<T extends Data, C extends Compute = Compute>(
  // property: BindFunctionThis<T, SSO<T>> & T,
  property: T,
  computedProperty?: C & DisallowCommonKeys<C, T> & Record<keyof C, Function>,
): SSO<T, RecordWithReturn<C>> {
  if (!isObject(property)) {
    throw new Error('The input parameter must be an Object.');
  }
  type Self = SSO<T, RecordWithReturn<C>>;
  let isInMethod = false;
  const config = { ...globalConfig };
  const state = Object.create(null) as State<T>;
  const methods = Object.create(null) as Record<keyof T, ArgumentsVoid>;

  for (let i = 0, keys = Object.keys(property) as (keyof T)[], len = keys.length; i < len; i++) {
    const key = keys[i];
    const initVal = property[key];

    if (initVal instanceof Function) {
      methods[key] = function (...args) {
        isInMethod = true;
        const res = initVal.call(store.proxy, ...args);

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
          return property[key] as T[keyof T];
        },
        setSnapshot(val) {
          if (!isEqual(val, property[key])) {
            (property[key] as T[keyof T]) = val;
            config.next(
              function () {
                for (const iteration of listeners.values()) {
                  iteration();
                }
              },
              key,
              property as T,
            );
          }
        },
        useSnapshot() {
          return useSyncExternalStore(
            state[key].subscribe,
            state[key].getSnapshot,
            state[key].getSnapshot,
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
        state[key].setSnapshot(val instanceof Function ? val(property[key] as T[keyof T]) : val);
      } else {
        throw new Error(`"${String(key)}" is a method and cannot be updated.`);
      }
    } else {
      throw new Error(`"${String(key)}" has not been initialized in the store.`);
    }
  }
  const store = Proxy.revocable(Function() as SSO<T, RecordWithReturn<C>>, {
    get<K extends keyof T & keyof C & string & symbol>(_: any, key: K, rec: Self) {
      if (computedProperty && key in computedProperty) {
        isInMethod = true;
        const res = (computedProperty![key] as VoidFunction).call(rec);

        isInMethod = false;
        return res;
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

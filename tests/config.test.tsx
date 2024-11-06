/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import ReactDOM from 'react-dom';
import sso, { SSOConfig } from '../src';

/**
 * @jest-environment jsdom
 */
describe('sso', () => {
  const store = sso({
    count: 0,
    list: [0],
    obj: {
      a1: 1,
      a: { a: 1, c: '' },
      b: () => 1 + 2,
    } as Record<string, unknown>,
    inc(this: typeof store) {
      console.log(this.obj);
      store.count++;
      this.list = [1];
      store.list = [...store.list]; // not update
      store.list = this.list.concat(store.count);
      this.obj = { ...store.obj };
      store.obj = { ...store.obj, d: 2 };
      this.obj = { ...this.obj, a1: '', a: { a: 2 }, b: () => 2 + 1 };
      return 1
    },
  });
  const App = () => {
    const { list, count, inc } = store;

    return (
      <>
        <p>click:{count}</p>
        <button onClick={inc}>inc</button>
        <button onClick={() => store.count++}>btn2</button>
        <button onClick={() => store('count', (prev) => prev + 1)}>btn3</button>
        {list.map((e, i) => (
          <React.Fragment key={i}>{e}</React.Fragment>
        ))}
      </>
    );
  };

  it('sso.config', () => {
    expect(() => {
      // @ts-ignore
      sso.config(false);
    }).toThrow('Illegal configuration.');
    expect(() => {
      // @ts-ignore
      sso.config({ next: (update) => update(), a: 1 });
    }).toThrow('The "a" configuration item is currently not supported.');
    expect(() => {
      // @ts-ignore
      sso.config({ next: false });
    }).toThrow('next does not support boolean type, it should be a function.');
    sso.config({ next: (update) => update() });
    store((): Partial<SSOConfig> => ({ next: (update) => update() }));
    store.count = 0;
  });
  it('react < 18 batched updates', () => {
    sso.config({ next: ReactDOM.unstable_batchedUpdates });
  });
  it('react render', () => {
    const { getByText } = render(<App />);

    fireEvent.click(getByText('inc'));
    act(() => {
      expect(getByText('click:1')).toBeDefined();
    });
    fireEvent.click(getByText('btn2'));
    act(() => {
      expect(getByText('click:2')).toBeDefined();
    });
    fireEvent.click(getByText('btn3'));
    act(() => {
      expect(getByText('click:3')).toBeDefined();
    });
  });
});

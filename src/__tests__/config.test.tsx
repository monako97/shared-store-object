/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import ReactDOM from 'react-dom';
import sso, { SSOConfig } from '../index';

/**
 * @jest-environment jsdom
 */
describe('sso', () => {
  const store = sso({
    count: 0,
    inc: () => store.count++,
  });
  const App = () => {
    const { count, inc } = store;

    return (
      <>
        <p>{count}</p>
        <button onClick={inc}>inc</button>
        <button onClick={() => store.count++}>btn2</button>
        <button onClick={() => store('count', (prev) => prev + 1)}>btn3</button>
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
      expect(getByText('1')).toBeDefined();
    });
    fireEvent.click(getByText('btn2'));
    act(() => {
      expect(getByText('2')).toBeDefined();
    });
    fireEvent.click(getByText('btn3'));
    act(() => {
      expect(getByText('3')).toBeDefined();
    });
  });
});

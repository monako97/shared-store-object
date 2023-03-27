import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import ReactDOM from 'react-dom';
import sso from '../index';

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
    sso.config({ next: (update) => update() });
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

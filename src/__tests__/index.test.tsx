/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { act, render } from '@testing-library/react';
import sso from '../index';

/**
 * @jest-environment jsdom
 */
describe('sso', () => {
  const store = sso({
    count: 0,
    inc: () => store.count++,
  });

  beforeAll(() => {
    render(<div />);
  });
  it('The input parameter must be an Object.', () => {
    expect(() => {
      // @ts-ignore
      sso();
    }).toThrow('The input parameter must be an Object.');
  });
  it('has not been initialized in the store.', () => {
    expect(() => {
      // @ts-ignore
      store.a = 1;
    }).toThrow('"a" has not been initialized in the store.');
  });
  it('The update program should be a function.', () => {
    expect(() => {
      // @ts-ignore
      store('count', 1);
    }).toThrow('The update program for "count" should be a function.');
  });
  it('method cannot be updated.', () => {
    expect(() => {
      store.inc = () => -1;
    }).toThrow('"inc" is a method and cannot be updated.');
  });
  it('updater', () => {
    act(() => {
      store('count', (prev) => prev + 1);
      expect(store.count).toBe(1);
      store.count = 3;
      expect(store.count).toBe(3);
      store.count = 0;
      expect(store.count).toBe(0);
    });
  });
  it('revoke', () => {
    const app = sso({
      count: 0,
    });

    app();
    expect(app).toBeDefined();
  });
});

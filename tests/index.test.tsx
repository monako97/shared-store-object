/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { act, render } from '@testing-library/react';
import sso from '../src';

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
      // @ts-ignore
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
  it('compute', () => {
    const app = sso(
      {
        count: 1,
        age: 2,
        a: 1,
      },
      {
        b() {
          return app.age + app.count;
        },
        cc() {
          if (app.age > 1) return 'sa';
          if (app.age > 2) return (app.age += 1);
          return null;
        },
        c() {
          return app.age + 'c';
        },
        ac() {
          return 2;
        },
        // a: 21,
        // aaaa: 2,
      }
    );

    expect(app.b).toBe(3);
    app.count = 2;
    expect(app.b).toBe(4);
    app.age = 12;
    expect(app.b).toBe(14);
    expect(app.c).toBe('12c');
    app.age = 1;
    expect(app.c).toBe('1c');
    expect(() => {
      // @ts-ignore
      app.b = 2;
    }).toThrow('"b" is a Computed property and cannot be updated.');
  });
});

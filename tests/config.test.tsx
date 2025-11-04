import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { unstable_batchedUpdates } from 'react-dom';
import sso, { type SSOConfig } from 'shared-store-object';

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  value: true,
  writable: true,
});

describe('sso', () => {
  const store = sso(
    {
      count: 0,
      list: [0],
      obj: {
        a1: 1,
        a: { a: 1, c: '' },
        b: () => 1 + 2,
      } as Record<string, unknown>,
      inc() {
        console.log(this.obj);
        store.count++;
        this.list = [1];
        store.list = [...store.list]; // not update
        store.list = this.list.concat(store.count);
        this.obj = { ...store.obj };
        store.obj = { ...store.obj, d: 2 };
        this.obj = { ...this.obj, a1: '', a: { a: 2 }, b: () => 2 + 1 };
        return 1;
      },
    },
    {
      listCount() {
        return store.list.length;
      },
    }
  );
  const App = () => {
    const { list, count, listCount, inc } = store;

    return (
      <>
        <p>click:{count}</p>
        <p>list count:{listCount}</p>
        <button onClick={inc}>inc</button>
        <button onClick={() => store.count++}>btn2</button>
        <button onClick={() => store('count', (prev) => prev + 1)}>btn3</button>
        {list.map((e, i) => (
          <span key={i}>{`list:${e}`}</span>
        ))}
      </>
    );
  };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

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
    sso.config({ next: unstable_batchedUpdates });
  });
  it('react render', async () => {
    await act(async () => {
      root.render(<App />);
    });
    const [incBtn, btn2, btn3] = container.querySelectorAll('button');

    await act(async () => {
      incBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(
      [...container.querySelectorAll('span')].map((item) => item.textContent).includes('list:1')
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll('p')].map((item) => item.textContent).includes('click:1')
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll('p')].map((item) => item.textContent).includes('list count:2')
    ).toBeTruthy();

    await act(async () => {
      btn2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(
      [...container.querySelectorAll('p')].map((item) => item.textContent).includes('click:2')
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll('p')].map((item) => item.textContent).includes('list count:2')
    ).toBeTruthy();

    await act(async () => {
      btn3.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(
      [...container.querySelectorAll('p')].map((item) => item.textContent).includes('click:3')
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll('p')].map((item) => item.textContent).includes('list count:2')
    ).toBeTruthy();

    await act(async () => {
      incBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(
      [...container.querySelectorAll('span')].map((item) => item.textContent).includes('list:1')
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll('span')].map((item) => item.textContent).includes('list:4')
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll('p')].map((item) => item.textContent).includes('click:4')
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll('p')].map((item) => item.textContent).includes('list count:2')
    ).toBeTruthy();

    await act(async () => {
      root.unmount();
    });
    expect(() => {
      store.listCount === 0;
      // @ts-ignore
      store.listCount = 100; // should not update
    }).toThrow('"listCount" is a Computed property and cannot be updated.');
  });
});

import React from 'react';
import expose from 'expose';

// Intercept expose default export's set_state to trace router changes
const _origSetState = expose.set_state.bind(expose);
expose.set_state = (id, state) => {
  if (id === 'router') {
    // Wrap setState to trace who calls it
    const entry = expose.states?.['router'];
    if (entry && !entry._spied) {
      entry._spied = true;
      const origEntry = entry.setState.bind(entry);
      entry.setState = (s) => {
        const stack = new Error().stack?.split('\n').slice(2, 5).join(' → ') || '';
        console.log(`[router.setState] path=${s.path} | ${stack}`);
        origEntry(s);
      };
    }
    const stack = new Error().stack?.split('\n').slice(2, 5).join(' → ') || '';
    console.log(`[expose router] path=${state.path} | ${stack}`);
  }
  return _origSetState(id, state);
};
// Import from /pure to disable RTL's automatic afterEach cleanup.
// Tests that share a wrapper across multiple it() blocks (via beforeAll) need
// the component to stay mounted between tests.
import { render, fireEvent, act } from '@testing-library/react/pure';
import { flushSync } from 'react-dom';
import RouteContainer from 'elements/route-container';
import MainContainer from 'main-container';
import routes from 'routes';

// Enzyme-compatible wrapper built on top of RTL + DOM queries.
// Replaces enzyme's mount() so that test files only need their enzyme imports removed.
const makeEl = (elOrSelector) => {
  const getEl = () => {
    if (elOrSelector === null || elOrSelector === undefined) return null;
    if (typeof elOrSelector === 'string') return document.querySelector(elOrSelector);
    return elOrSelector;
  };

  const self = {
    hostNodes: () => self,
    simulate: (event, opts) => {
      const el = getEl();
      if (!el) {
        if (typeof elOrSelector === 'string') {
          console.warn(`[test-helpers] simulate('${event}') — element not found: ${elOrSelector}`);
        }
        return;
      }
      if (event === 'click' && typeof elOrSelector === 'string' && elOrSelector.includes('accordion')) {
        const desc = Object.getOwnPropertyDescriptor(window.history, 'replaceState') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window.history), 'replaceState');
        console.log(`[accordion] replaceState writable=${desc?.writable} | fn=${window.history.replaceState?.toString().slice(0,40)}`);
      }
      if (event === 'click') {
        fireEvent.click(el);
      } else if (event === 'change') {
        // Normalize value to string — DOM events always coerce to string, and
        // handlers in this codebase use parseInt/parseFloat to convert back.
        const value = opts?.target?.value;
        const normalized = value !== undefined && typeof value !== 'string'
          ? { ...opts, target: { ...opts.target, value: String(value) } }
          : opts;
        fireEvent.change(el, normalized);
      }
    },
    exists: () => !!getEl(),
    text: () => getEl()?.textContent ?? '',
    name: () => getEl()?.tagName?.toLowerCase() ?? '',
    type: () => getEl()?.tagName ?? null,
  };
  return self;
};

const createWrapper = () => ({
  find: (selector) => makeEl(selector),
  findWhere: (fn) => {
    for (const el of document.querySelectorAll('*')) {
      const proxy = {
        type: () => el.tagName,
        name: () => el.tagName?.toLowerCase() ?? '',
        text: () => el.textContent,
      };
      try { if (fn(proxy)) return makeEl(el); } catch (_) {}
    }
    return makeEl(null);
  },
  exists: (selector) => !!document.querySelector(selector),
  // Flush any pending React state updates (replaces enzyme's wrapper.update())
  update: () => {
    // Use flushSync to process pending state updates synchronously,
    // which avoids act()'s double-render issues with UNSAFE_componentWillMount.
    try { flushSync(() => {}); } catch (_) {}
    act(() => {});
  },
});

// Track the active render so we can clean it up before starting a new one.
let _unmount = null;
let _container = null;

export const getPageWrapper = () => {
  // Flush pending React updates then unmount the previous render.
  // Creating a new container each time avoids RTL caching the old root.
  if (_unmount) { act(() => { _unmount(); }); _unmount = null; }
  if (_container && _container.parentNode) {
    _container.parentNode.removeChild(_container);
  }
  _container = document.createElement('div');
  document.body.appendChild(_container);

  let publicRouteProps = {};
  const cont = _container;

  const { unmount } = render(
    <RouteContainer routes={routes}>
      {(routeProps) => {
        publicRouteProps = routeProps;
        return (
          <MainContainer
            test={true}
            main={{}}
            data={{}}
            loading={false}
            {...routeProps}
          />
        );
      }}
    </RouteContainer>,
    { container: cont }
  );

  _unmount = unmount;

  return {
    wrapper: createWrapper(),
    getRouteProps: () => publicRouteProps,
  };
};

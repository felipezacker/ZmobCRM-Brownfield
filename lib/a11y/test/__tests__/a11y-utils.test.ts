import { describe, it, expect } from 'vitest';
import {
  expectAriaLabel,
  expectAriaLabelledBy,
  expectAriaDescribedBy,
  expectRole,
  expectFocusable,
  expectNotFocusable,
  simulateTab,
  simulateEscape,
  simulateEnter,
  simulateSpace,
  getFocusableElements,
} from '../a11y-utils';

describe('a11y-utils', () => {
  describe('expectAriaLabel', () => {
    it('passes for matching aria-label', () => {
      const el = document.createElement('button');
      el.setAttribute('aria-label', 'Close');
      expectAriaLabel(el, 'Close');
    });
  });

  describe('expectAriaLabelledBy', () => {
    it('passes for matching aria-labelledby', () => {
      const el = document.createElement('div');
      el.setAttribute('aria-labelledby', 'title-1');
      expectAriaLabelledBy(el, 'title-1');
    });
  });

  describe('expectAriaDescribedBy', () => {
    it('passes for matching aria-describedby', () => {
      const el = document.createElement('input');
      el.setAttribute('aria-describedby', 'help-1');
      expectAriaDescribedBy(el, 'help-1');
    });
  });

  describe('expectRole', () => {
    it('passes for matching role', () => {
      const el = document.createElement('div');
      el.setAttribute('role', 'dialog');
      expectRole(el, 'dialog');
    });
  });

  describe('expectFocusable', () => {
    it('passes for tabindex >= 0', () => {
      const el = document.createElement('div');
      el.tabIndex = 0;
      expectFocusable(el);
    });
  });

  describe('expectNotFocusable', () => {
    it('passes for tabindex -1', () => {
      const el = document.createElement('div');
      el.tabIndex = -1;
      expectNotFocusable(el);
    });
  });

  describe('keyboard simulation', () => {
    it('simulateTab dispatches keydown', () => {
      const el = document.createElement('button');
      document.body.appendChild(el);
      el.focus();
      let called = false;
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') called = true;
      });
      simulateTab();
      expect(called).toBe(true);
      document.body.removeChild(el);
    });

    it('simulateEscape dispatches Escape', () => {
      const el = document.createElement('button');
      document.body.appendChild(el);
      el.focus();
      let called = false;
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') called = true;
      });
      simulateEscape();
      expect(called).toBe(true);
      document.body.removeChild(el);
    });

    it('simulateEnter dispatches Enter', () => {
      const el = document.createElement('button');
      document.body.appendChild(el);
      el.focus();
      let called = false;
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') called = true;
      });
      simulateEnter();
      expect(called).toBe(true);
      document.body.removeChild(el);
    });

    it('simulateSpace dispatches Space', () => {
      const el = document.createElement('button');
      document.body.appendChild(el);
      el.focus();
      let called = false;
      el.addEventListener('keydown', (e) => {
        if (e.key === ' ') called = true;
      });
      simulateSpace();
      expect(called).toBe(true);
      document.body.removeChild(el);
    });
  });

  describe('getFocusableElements', () => {
    it('finds buttons and inputs', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Click</button>
        <input type="text" />
        <a href="/link">Link</a>
        <div>Not focusable</div>
        <button disabled>Disabled</button>
      `;
      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(3); // button, input, a (not disabled button, not div)
    });

    it('returns empty for no focusable elements', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>Text only</p>';
      expect(getFocusableElements(container)).toHaveLength(0);
    });
  });
});

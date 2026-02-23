import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast, useOptionalToast } from '../ToastContext';

function TestConsumer() {
  const { addToast, removeToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Success!', 'success')}>Add Success</button>
      <button onClick={() => addToast('Error!', 'error')}>Add Error</button>
      <button onClick={() => addToast('Info!')}>Add Info</button>
      <button onClick={() => addToast('Warning!', 'warning')}>Add Warning</button>
    </div>
  );
}

function OptionalConsumer() {
  const { addToast, showToast } = useOptionalToast();
  return (
    <div>
      <button onClick={() => addToast('opt', 'info')}>Opt Add</button>
      <button onClick={() => showToast('show', 'info')}>Opt Show</button>
    </div>
  );
}

describe('ToastContext', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <span>Hello</span>
      </ToastProvider>
    );
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('adds and displays a success toast', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText('Add Success'));
    expect(screen.getByText('Success!')).toBeDefined();
  });

  it('adds an error toast with alert role', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText('Add Error'));
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('adds info toast (default type)', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText('Add Info'));
    expect(screen.getByText('Info!')).toBeDefined();
  });

  it('adds warning toast', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText('Add Warning'));
    expect(screen.getByText('Warning!')).toBeDefined();
  });

  it('removes toast via close button', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText('Add Success'));
    expect(screen.getByText('Success!')).toBeDefined();
    const closeBtn = screen.getByLabelText('Fechar notificação: Success!');
    await user.click(closeBtn);
    expect(screen.queryByText('Success!')).toBeNull();
  });

  it('useToast throws outside provider', () => {
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useToast must be used within a ToastProvider');
  });

  it('useOptionalToast works outside provider (no-op)', async () => {
    const user = userEvent.setup();
    render(<OptionalConsumer />);
    // Should not throw
    await user.click(screen.getByText('Opt Add'));
    await user.click(screen.getByText('Opt Show'));
  });

  it('useOptionalToast works inside provider', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <OptionalConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText('Opt Add'));
    expect(screen.getByText('opt')).toBeDefined();
  });
});

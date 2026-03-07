import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast, useOptionalToast } from '../ToastContext';
import { Button } from '@/components/ui/button';

function TestConsumer() {
  const { addToast, removeToast } = useToast();
  return (
    <div>
      <Button onClick={() => addToast('Success!', 'success')}>Add Success</Button>
      <Button onClick={() => addToast('Error!', 'error')}>Add Error</Button>
      <Button onClick={() => addToast('Info!')}>Add Info</Button>
      <Button onClick={() => addToast('Warning!', 'warning')}>Add Warning</Button>
    </div>
  );
}

function OptionalConsumer() {
  const { addToast, showToast } = useOptionalToast();
  return (
    <div>
      <Button onClick={() => addToast('opt', 'info')}>Opt Add</Button>
      <Button onClick={() => showToast('show', 'info')}>Opt Show</Button>
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

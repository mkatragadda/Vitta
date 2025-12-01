import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToastNotification, { ToastContainer } from '../../../components/ToastNotification';

describe('ToastNotification', () => {
  describe('Types', () => {
    test('should render success toast', () => {
      render(<ToastNotification type="success" message="Operation successful" />);
      expect(screen.getByText('Operation successful')).toBeInTheDocument();
    });

    test('should render error toast', () => {
      render(<ToastNotification type="error" message="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    test('should render warning toast', () => {
      render(<ToastNotification type="warning" message="Be careful" />);
      expect(screen.getByText('Be careful')).toBeInTheDocument();
    });

    test('should render info toast (default)', () => {
      render(<ToastNotification message="Information" />);
      expect(screen.getByText('Information')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    test('should display custom message', () => {
      const message = 'Custom test message';
      render(<ToastNotification message={message} />);
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    test('should display empty message when not provided', () => {
      const { container } = render(<ToastNotification />);
      expect(container.querySelector('[class*="text-"]')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    test('should display action button when provided', () => {
      const action = { label: 'Retry', onClick: jest.fn() };
      render(
        <ToastNotification
          message="Failed"
          type="error"
          action={action}
        />
      );
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    test('should call action onClick when clicked', () => {
      const mockClick = jest.fn();
      const action = { label: 'Undo', onClick: mockClick };
      render(
        <ToastNotification message="Deleted" action={action} />
      );
      fireEvent.click(screen.getByText('Undo'));
      expect(mockClick).toHaveBeenCalled();
    });

    test('should not display action when not provided', () => {
      render(<ToastNotification message="Info" />);
      expect(screen.queryByText(/Retry|Undo|Action/)).not.toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    test('should have close button', () => {
      const { container } = render(
        <ToastNotification message="Test" />
      );
      const closeButton = container.querySelector('button');
      expect(closeButton).toBeInTheDocument();
    });

    test('should hide toast when close button clicked', async () => {
      const { container } = render(
        <ToastNotification message="Test" duration={0} />
      );
      const closeButton = container.querySelector('button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        const toast = container.querySelector('[class*="animate-in"]');
        expect(toast).not.toBeInTheDocument();
      }, { timeout: 100 });
    });

    test('should call onDismiss when closed', async () => {
      const mockDismiss = jest.fn();
      const { container } = render(
        <ToastNotification message="Test" onDismiss={mockDismiss} duration={0} />
      );
      const closeButton = container.querySelector('button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(mockDismiss).toHaveBeenCalled();
      }, { timeout: 100 });
    });
  });

  describe('Auto-dismiss', () => {
    jest.useFakeTimers();

    test('should auto-dismiss after duration', async () => {
      const mockDismiss = jest.fn();
      render(
        <ToastNotification
          message="Test"
          duration={3000}
          onDismiss={mockDismiss}
        />
      );

      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockDismiss).toHaveBeenCalled();
      });
    });

    test('should not auto-dismiss when duration is 0', () => {
      const mockDismiss = jest.fn();
      render(
        <ToastNotification
          message="Test"
          duration={0}
          onDismiss={mockDismiss}
        />
      );

      jest.advanceTimersByTime(5000);
      expect(mockDismiss).not.toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  describe('ID prop', () => {
    test('should accept id prop', () => {
      const { container } = render(
        <ToastNotification id="toast-1" message="Test" />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});

describe('ToastContainer', () => {
  const mockToasts = [
    {
      id: '1',
      type: 'success',
      message: 'Success message',
      duration: 4000
    },
    {
      id: '2',
      type: 'error',
      message: 'Error message',
      duration: 4000
    }
  ];

  describe('Multiple Toasts', () => {
    test('should render multiple toasts', () => {
      render(<ToastContainer toasts={mockToasts} />);
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    test('should not render when empty', () => {
      const { container } = render(<ToastContainer toasts={[]} />);
      expect(container.firstChild).toBeNull();
    });

    test('should not render when undefined', () => {
      const { container } = render(<ToastContainer />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Dismissal', () => {
    test('should call onDismiss with toast id', () => {
      const mockDismiss = jest.fn();
      const { container } = render(
        <ToastContainer toasts={mockToasts} onDismiss={mockDismiss} />
      );

      const closeButtons = container.querySelectorAll('button');
      fireEvent.click(closeButtons[0]);

      expect(mockDismiss).toHaveBeenCalledWith('1');
    });
  });
});

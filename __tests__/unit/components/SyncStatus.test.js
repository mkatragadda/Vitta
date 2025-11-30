import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SyncStatus from '../../../components/SyncStatus';

describe('SyncStatus', () => {
  const mockOperations = [
    {
      id: 'op-1',
      type: 'message',
      status: 'success',
      timestamp: Date.now()
    },
    {
      id: 'op-2',
      type: 'card_add',
      status: 'syncing',
      timestamp: Date.now()
    },
    {
      id: 'op-3',
      type: 'card_update',
      status: 'pending',
      timestamp: Date.now()
    },
    {
      id: 'op-4',
      type: 'card_delete',
      status: 'failed',
      timestamp: Date.now(),
      error: 'Network error'
    }
  ];

  describe('Visibility', () => {
    test('should not render when no operations', () => {
      const { container } = render(<SyncStatus operations={[]} />);
      expect(container.firstChild).toBeNull();
    });

    test('should render when operations exist', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('Sync Queue')).toBeInTheDocument();
    });

    test('should show operation count in badge', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Operation Listing', () => {
    test('should display all operations', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('💬 Message')).toBeInTheDocument();
      expect(screen.getByText('➕ Add Card')).toBeInTheDocument();
      expect(screen.getByText('✏️ Update Card')).toBeInTheDocument();
      expect(screen.getByText('❌ Delete Card')).toBeInTheDocument();
    });

    test('should display operation status', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('success')).toBeInTheDocument();
      expect(screen.getByText('syncing')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });

    test('should display error message for failed operations', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('Stats', () => {
    test('should count pending operations', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('should count syncing operations', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('Syncing')).toBeInTheDocument();
    });

    test('should count completed operations', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    test('should count failed operations', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('Collapse/Expand', () => {
    test('should expand by default', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('💬 Message')).toBeVisible();
    });

    test('should start collapsed when isCollapsed is true', () => {
      const { container } = render(
        <SyncStatus operations={mockOperations} isCollapsed={true} />
      );
      const operations = container.querySelectorAll('[class*="border-b"]');
      expect(operations.length).toBe(0);
    });

    test('should call onCollapse when toggled', () => {
      const mockCollapse = jest.fn();
      render(
        <SyncStatus operations={mockOperations} onCollapse={mockCollapse} />
      );
      const toggleButton = screen.getByText('−');
      fireEvent.click(toggleButton);
      expect(mockCollapse).toHaveBeenCalledWith(false);
    });
  });

  describe('Clear Completed', () => {
    test('should show clear button when there are completed operations', () => {
      render(<SyncStatus operations={mockOperations} />);
      expect(screen.getByText('Clear Completed')).toBeInTheDocument();
    });

    test('should not show clear button when no completed operations', () => {
      const noSuccess = mockOperations.filter(op => op.status !== 'success');
      render(<SyncStatus operations={noSuccess} />);
      expect(screen.queryByText('Clear Completed')).not.toBeInTheDocument();
    });

    test('should call onClearCompleted when button clicked', () => {
      const mockClear = jest.fn();
      render(
        <SyncStatus operations={mockOperations} onClearCompleted={mockClear} />
      );
      fireEvent.click(screen.getByText('Clear Completed'));
      expect(mockClear).toHaveBeenCalled();
    });
  });

  describe('Timestamps', () => {
    test('should display operation timestamps', () => {
      render(<SyncStatus operations={mockOperations} />);
      const times = screen.getAllByText(/:\d{2}/); // Match time format HH:MM:SS
      expect(times.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    test('should render nothing with empty array', () => {
      const { container } = render(<SyncStatus operations={[]} />);
      expect(container.firstChild).toBeNull();
    });

    test('should render nothing with undefined', () => {
      const { container } = render(<SyncStatus />);
      expect(container.firstChild).toBeNull();
    });
  });
});

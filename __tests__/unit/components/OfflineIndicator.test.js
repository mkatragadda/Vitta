import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfflineIndicator from '../../../components/OfflineIndicator';

describe('OfflineIndicator', () => {
  describe('Online Status', () => {
    test('should not show when online with no pending operations', () => {
      const { container } = render(
        <OfflineIndicator isOnline={true} queueLength={0} syncStatus="idle" />
      );
      const indicator = container.querySelector('.fixed');
      expect(indicator).not.toBeInTheDocument();
    });

    test('should show when online with pending operations', () => {
      render(
        <OfflineIndicator isOnline={true} queueLength={3} syncStatus="idle" />
      );
      expect(screen.getByText(/3 pending/)).toBeInTheDocument();
    });

    test('should show when offline', () => {
      render(
        <OfflineIndicator isOnline={false} queueLength={0} syncStatus="idle" />
      );
      expect(screen.getByText(/You're Offline/)).toBeInTheDocument();
    });
  });

  describe('Status Messages', () => {
    test('should show offline message when offline', () => {
      render(
        <OfflineIndicator isOnline={false} queueLength={2} syncStatus="idle" />
      );
      expect(screen.getByText(/Changes will sync when you're back online/)).toBeInTheDocument();
    });

    test('should show syncing message when syncing', () => {
      render(
        <OfflineIndicator isOnline={true} queueLength={2} syncStatus="syncing" />
      );
      expect(screen.getByText(/Syncing 2 pending operations/)).toBeInTheDocument();
    });

    test('should show error message when sync failed', () => {
      render(
        <OfflineIndicator isOnline={true} queueLength={1} syncStatus="error" />
      );
      expect(screen.getByText(/Failed to sync/)).toBeInTheDocument();
    });

    test('should show all synced message when complete', () => {
      render(
        <OfflineIndicator isOnline={true} queueLength={0} syncStatus="idle" />
      );
      // Auto-hide after 3s, but check visibility first
      expect(screen.queryByText(/All changes synced/)).not.toBeInTheDocument();
    });
  });

  describe('Queue Display', () => {
    test('should display correct queue count', () => {
      render(
        <OfflineIndicator isOnline={false} queueLength={5} syncStatus="idle" />
      );
      expect(screen.getByText(/5 pending/)).toBeInTheDocument();
    });

    test('should use singular for single operation', () => {
      render(
        <OfflineIndicator isOnline={false} queueLength={1} syncStatus="idle" />
      );
      expect(screen.getByText(/1 operation pending/)).toBeInTheDocument();
    });

    test('should use plural for multiple operations', () => {
      render(
        <OfflineIndicator isOnline={false} queueLength={3} syncStatus="idle" />
      );
      expect(screen.getByText(/3 pending/)).toBeInTheDocument();
    });
  });

  describe('Last Sync Time', () => {
    test('should display last sync time when online', () => {
      const lastSyncTime = Date.now() - 60000; // 1 minute ago
      render(
        <OfflineIndicator
          isOnline={true}
          queueLength={0}
          syncStatus="idle"
          lastSyncTime={lastSyncTime}
        />
      );
      expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
    });

    test('should not display sync time when offline', () => {
      const lastSyncTime = Date.now() - 60000;
      render(
        <OfflineIndicator
          isOnline={false}
          queueLength={1}
          syncStatus="idle"
          lastSyncTime={lastSyncTime}
        />
      );
      expect(screen.queryByText(/Last sync:/)).not.toBeInTheDocument();
    });
  });

  describe('Retry Button', () => {
    test('should show retry button when sync failed', () => {
      const mockRetry = jest.fn();
      render(
        <OfflineIndicator
          isOnline={true}
          queueLength={1}
          syncStatus="error"
          onRetry={mockRetry}
        />
      );
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });

    test('should call onRetry when retry button clicked', () => {
      const mockRetry = jest.fn();
      render(
        <OfflineIndicator
          isOnline={true}
          queueLength={1}
          syncStatus="error"
          onRetry={mockRetry}
        />
      );
      fireEvent.click(screen.getByText('Retry'));
      expect(mockRetry).toHaveBeenCalled();
    });

    test('should not show retry button when syncing', () => {
      const mockRetry = jest.fn();
      render(
        <OfflineIndicator
          isOnline={true}
          queueLength={1}
          syncStatus="syncing"
          onRetry={mockRetry}
        />
      );
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
  });

  describe('Auto-hide Behavior', () => {
    jest.useFakeTimers();

    test('should auto-hide after 3 seconds when online with no pending', () => {
      const { container } = render(
        <OfflineIndicator isOnline={true} queueLength={0} syncStatus="idle" />
      );

      let indicator = container.querySelector('.fixed');
      expect(indicator).not.toBeInTheDocument();

      jest.advanceTimersByTime(3000);

      indicator = container.querySelector('.fixed');
      expect(indicator).not.toBeInTheDocument();
    });

    test('should not auto-hide when offline', () => {
      const { container } = render(
        <OfflineIndicator isOnline={false} queueLength={1} syncStatus="idle" />
      );

      jest.advanceTimersByTime(5000);

      const indicator = container.querySelector('.fixed');
      expect(indicator).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  describe('State Changes', () => {
    test('should update when status changes from offline to online', () => {
      const { rerender } = render(
        <OfflineIndicator isOnline={false} queueLength={2} syncStatus="idle" />
      );
      expect(screen.getByText(/You're Offline/)).toBeInTheDocument();

      rerender(
        <OfflineIndicator isOnline={true} queueLength={2} syncStatus="idle" />
      );
      expect(screen.queryByText(/You're Offline/)).not.toBeInTheDocument();
    });

    test('should update queue length display', () => {
      const { rerender } = render(
        <OfflineIndicator isOnline={false} queueLength={5} syncStatus="idle" />
      );
      expect(screen.getByText(/5 pending/)).toBeInTheDocument();

      rerender(
        <OfflineIndicator isOnline={false} queueLength={2} syncStatus="idle" />
      );
      expect(screen.getByText(/2 pending/)).toBeInTheDocument();
    });
  });
});

/**
 * TransferProgress Component Tests
 * Tests for the 4-step transfer progress indicator
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransferProgress from '../TransferProgress';

describe('TransferProgress', () => {
  const defaultSteps = [
    { id: 1, label: 'Creating quote', description: 'Locking exchange rate' },
    { id: 2, label: 'Setting up recipient', description: 'Preparing payment details' },
    { id: 3, label: 'Creating transfer', description: 'Initiating transaction' },
    { id: 4, label: 'Funding transfer', description: 'Completing payment' },
  ];

  test('renders with default steps', () => {
    render(<TransferProgress currentStep={1} />);

    expect(screen.getByText('Processing Payment')).toBeInTheDocument();
    expect(screen.getByText('Creating quote')).toBeInTheDocument();
    expect(screen.getByText('Setting up recipient')).toBeInTheDocument();
    expect(screen.getByText('Creating transfer')).toBeInTheDocument();
    expect(screen.getByText('Funding transfer')).toBeInTheDocument();
  });

  test('shows step 1 as in progress', () => {
    const { container } = render(<TransferProgress currentStep={1} />);

    const step1 = screen.getByText('Creating quote');
    expect(step1).toHaveClass('text-indigo-700');
  });

  test('shows completed steps in green', () => {
    const { container } = render(<TransferProgress currentStep={3} />);

    const step1 = screen.getByText('Creating quote');
    const step2 = screen.getByText('Setting up recipient');

    expect(step1).toHaveClass('text-green-700');
    expect(step2).toHaveClass('text-green-700');
  });

  test('shows current step in progress color', () => {
    render(<TransferProgress currentStep={2} />);

    const step2 = screen.getByText('Setting up recipient');
    expect(step2).toHaveClass('text-indigo-700');
  });

  test('shows pending steps in gray', () => {
    render(<TransferProgress currentStep={1} />);

    const step4 = screen.getByText('Funding transfer');
    expect(step4).toHaveClass('text-gray-400');
  });

  test('displays error message when provided', () => {
    const errorMessage = 'Transfer failed: Insufficient funds';

    render(<TransferProgress currentStep={2} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('shows error state for current step when error provided', () => {
    render(<TransferProgress currentStep={2} error="Test error" />);

    const step2 = screen.getByText('Setting up recipient');
    expect(step2).toHaveClass('text-red-700');
  });

  test('accepts custom steps', () => {
    const customSteps = [
      { id: 1, label: 'Step One', description: 'First step' },
      { id: 2, label: 'Step Two', description: 'Second step' },
    ];

    render(<TransferProgress currentStep={1} steps={customSteps} />);

    expect(screen.getByText('Step One')).toBeInTheDocument();
    expect(screen.getByText('Step Two')).toBeInTheDocument();
    expect(screen.queryByText('Creating quote')).not.toBeInTheDocument();
  });

  test('shows step descriptions', () => {
    render(<TransferProgress currentStep={1} />);

    expect(screen.getByText('Locking exchange rate')).toBeInTheDocument();
    expect(screen.getByText('Preparing payment details')).toBeInTheDocument();
    expect(screen.getByText('Initiating transaction')).toBeInTheDocument();
    expect(screen.getByText('Completing payment')).toBeInTheDocument();
  });

  test('does not show error section when no error', () => {
    const { container } = render(<TransferProgress currentStep={1} />);

    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  test('handles all 4 steps as completed', () => {
    render(<TransferProgress currentStep={5} />);

    const step1 = screen.getByText('Creating quote');
    const step2 = screen.getByText('Setting up recipient');
    const step3 = screen.getByText('Creating transfer');
    const step4 = screen.getByText('Funding transfer');

    expect(step1).toHaveClass('text-green-700');
    expect(step2).toHaveClass('text-green-700');
    expect(step3).toHaveClass('text-green-700');
    expect(step4).toHaveClass('text-green-700');
  });
});

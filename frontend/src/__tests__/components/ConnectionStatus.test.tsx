/**
 * __tests__/components/ConnectionStatus.test.tsx
 * TDD spec for the SSE connection status pill badge.
 */

import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../../components/ConnectionStatus';

describe('ConnectionStatus component', () => {
  describe('given status=CONNECTING', () => {
    it('should render the text "CONNECTING..."', () => {
      render(<ConnectionStatus status="CONNECTING" />);
      expect(screen.getByText('CONNECTING...')).toBeInTheDocument();
    });

    it('should render the animated pulse dot', () => {
      const { container } = render(<ConnectionStatus status="CONNECTING" />);
      const dot = container.querySelector('.animate-pulse');
      expect(dot).toBeInTheDocument();
    });

    it('should apply yellow pill styling', () => {
      const { container } = render(<ConnectionStatus status="CONNECTING" />);
      const pill = container.firstChild as HTMLElement;
      expect(pill.className).toMatch(/yellow/);
    });
  });

  describe('given status=CONNECTED', () => {
    it('should render the text "LIVE"', () => {
      render(<ConnectionStatus status="CONNECTED" />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('should apply green pill styling', () => {
      const { container } = render(<ConnectionStatus status="CONNECTED" />);
      const pill = container.firstChild as HTMLElement;
      expect(pill.className).toMatch(/green/);
    });

    it('the dot should NOT have animate-pulse class', () => {
      const { container } = render(<ConnectionStatus status="CONNECTED" />);
      const dot = container.querySelector('.animate-pulse');
      expect(dot).not.toBeInTheDocument();
    });
  });

  describe('given status=RECONNECTING with no reconnectAttempt', () => {
    it('should render "RECONNECTING"', () => {
      render(<ConnectionStatus status="RECONNECTING" />);
      expect(screen.getByText('RECONNECTING')).toBeInTheDocument();
    });

    it('should apply yellow pill styling', () => {
      const { container } = render(<ConnectionStatus status="RECONNECTING" />);
      const pill = container.firstChild as HTMLElement;
      expect(pill.className).toMatch(/yellow/);
    });
  });

  describe('given status=RECONNECTING with reconnectAttempt=3', () => {
    it('should render "RECONNECTING (3)"', () => {
      render(<ConnectionStatus status="RECONNECTING" reconnectAttempt={3} />);
      expect(screen.getByText('RECONNECTING (3)')).toBeInTheDocument();
    });
  });

  describe('given status=FAILED', () => {
    it('should render "DISCONNECTED"', () => {
      render(<ConnectionStatus status="FAILED" />);
      expect(screen.getByText('DISCONNECTED')).toBeInTheDocument();
    });

    it('should apply red pill styling', () => {
      const { container } = render(<ConnectionStatus status="FAILED" />);
      const pill = container.firstChild as HTMLElement;
      expect(pill.className).toMatch(/red/);
    });
  });

  describe('accessibility', () => {
    it('the root element should be visible in the DOM', () => {
      const { container } = render(<ConnectionStatus status="CONNECTED" />);
      expect(container.firstChild).toBeVisible();
    });
  });
});

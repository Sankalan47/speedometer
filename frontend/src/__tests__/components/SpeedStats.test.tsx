/**
 * __tests__/components/SpeedStats.test.tsx
 * TDD spec for the four stat cards.
 */

import { render, screen } from '@testing-library/react';
import { SpeedStats } from '../../components/SpeedStats';

const defaultProps = { currentSpeed: 0, maxSpeed: 0, avgSpeed: 0, minSpeed: 0 };

describe('SpeedStats component', () => {
  describe('rendering stat cards', () => {
    it('should render a "Current" label', () => {
      render(<SpeedStats {...defaultProps} />);
      expect(screen.getByText(/current/i)).toBeInTheDocument();
    });

    it('should render a "Max" label', () => {
      render(<SpeedStats {...defaultProps} />);
      expect(screen.getByText(/^max$/i)).toBeInTheDocument();
    });

    it('should render a "Rolling Avg" label', () => {
      render(<SpeedStats {...defaultProps} />);
      expect(screen.getByText(/rolling avg/i)).toBeInTheDocument();
    });

    it('should render a "Min" label', () => {
      render(<SpeedStats {...defaultProps} />);
      expect(screen.getByText(/^min$/i)).toBeInTheDocument();
    });

    it('should render the sublabel "last 60 pts" on the avg card', () => {
      render(<SpeedStats {...defaultProps} />);
      expect(screen.getByText(/last 60 pts/i)).toBeInTheDocument();
    });

    it('should render "km/h" on all four cards', () => {
      render(<SpeedStats {...defaultProps} />);
      const units = screen.getAllByText('km/h');
      expect(units).toHaveLength(4);
    });
  });

  describe('given currentSpeed=75.3, maxSpeed=120, avgSpeed=88.7, minSpeed=45', () => {
    const props = { currentSpeed: 75.3, maxSpeed: 120, avgSpeed: 88.7, minSpeed: 45 };

    it('should display "75.3" formatted to 1 decimal place', () => {
      render(<SpeedStats {...props} />);
      expect(screen.getByText('75.3')).toBeInTheDocument();
    });

    it('should display "120.0" for maxSpeed', () => {
      render(<SpeedStats {...props} />);
      expect(screen.getByText('120.0')).toBeInTheDocument();
    });

    it('should display "88.7" for avgSpeed', () => {
      render(<SpeedStats {...props} />);
      expect(screen.getByText('88.7')).toBeInTheDocument();
    });

    it('should display "45.0" for minSpeed', () => {
      render(<SpeedStats {...props} />);
      expect(screen.getByText('45.0')).toBeInTheDocument();
    });
  });

  describe('boundary values', () => {
    it('currentSpeed=0 should display "0.0" without error', () => {
      render(<SpeedStats {...defaultProps} currentSpeed={0} />);
      const zeros = screen.getAllByText('0.0');
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });

    it('currentSpeed=300 should display "300.0"', () => {
      render(<SpeedStats {...defaultProps} currentSpeed={300} />);
      expect(screen.getByText('300.0')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { percentageToBasisPoints, basisPointsToPercentage, determineWinningBid } from '../utils';

describe('Marketplace UX & Math Helper Tests', () => {
  // 14. Percentage "5.00" converts to 500 bps.
  it('should convert 5.00% to 500 bps', () => {
    expect(percentageToBasisPoints('5.00')).toBe(500);
  });

  // 15. Percentage "0.25" converts to 25 bps.
  it('should convert 0.25% to 25 bps', () => {
    expect(percentageToBasisPoints('0.25')).toBe(25);
  });

  it('should convert whole percentage numbers', () => {
    expect(percentageToBasisPoints('12')).toBe(1200);
  });

  it('should convert basis points back to percentage strings', () => {
    expect(basisPointsToPercentage(500)).toBe('5.00');
    expect(basisPointsToPercentage(25)).toBe('0.25');
  });

  it('should throw error if percentage exceeds 30.00%', () => {
    expect(() => percentageToBasisPoints('31.00')).toThrow('Discount rate exceeds the maximum permitted');
  });

  it('should rank lowest discountRate as the winner', () => {
    const bids = [
      { bidder: 'A', fundingAmount: 1000, discountRate: 500, timestamp: 100 },
      { bidder: 'B', fundingAmount: 1000, discountRate: 400, timestamp: 200 }
    ];
    const winner = determineWinningBid(bids);
    expect(winner.bidder).toBe('B');
  });

  it('should resolve ties using earliest timestamp', () => {
    const bids = [
      { bidder: 'A', fundingAmount: 1000, discountRate: 400, timestamp: 100 },
      { bidder: 'B', fundingAmount: 1000, discountRate: 400, timestamp: 50 }
    ];
    const winner = determineWinningBid(bids);
    expect(winner.bidder).toBe('B');
  });

  it('should rank based on expectedYield percentage input correctly', () => {
    const bids = [
      { investor: 'A', bidAmount: 1000, expectedYield: '8.50', timestamp: 100 },
      { investor: 'B', bidAmount: 1000, expectedYield: '8.20', timestamp: 200 }
    ];
    const winner = determineWinningBid(bids);
    expect(winner.bidder).toBe('B');
  });
});

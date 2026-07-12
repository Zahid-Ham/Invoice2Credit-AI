export function percentageToBasisPoints(percentageStr) {
  const normalized = String(percentageStr).trim();
  const parts = normalized.split('.');
  
  let bps = 0n;
  if (parts.length === 1) {
    bps = BigInt(parts[0]) * 100n;
  } else {
    const whole = parts[0];
    let frac = parts[1].substring(0, 2);
    while (frac.length < 2) {
      frac += '0';
    }
    bps = BigInt(whole) * 100n + BigInt(frac);
  }
  
  const bpsNum = Number(bps);
  if (bpsNum < 0 || bpsNum > 3000) {
    throw new Error('Discount rate exceeds the maximum permitted (30.00%).');
  }
  return bpsNum;
}

export function basisPointsToPercentage(bps) {
  const bpsNum = Number(bps);
  const pct = (bpsNum / 100).toFixed(2);
  return pct;
}

export function determineWinningBid(bidsList) {
  if (!bidsList || bidsList.length === 0) return null;
  
  const normalized = bidsList.map(b => ({
    bidder: b.bidder || b.investorName || b.investor || '',
    fundingAmount: BigInt(b.fundingAmount || b.bidAmount || b.bid || 0),
    discountRate: Number(b.discountRate || (b.expectedYield ? percentageToBasisPoints(b.expectedYield) : 0)),
    timestamp: Number(b.timestamp || 0)
  }));

  let winning = normalized[0];
  for (let i = 1; i < normalized.length; i++) {
    const current = normalized[i];
    if (current.discountRate < winning.discountRate) {
      winning = current;
    } else if (current.discountRate === winning.discountRate) {
      if (current.timestamp < winning.timestamp) {
        winning = current;
      }
    }
  }
  return winning;
}

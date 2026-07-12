import { useQuery } from '@tanstack/react-query';
import { blockchainService } from '@/services/blockchainService';

export function useAuctionDetails(auctionId) {
  return useQuery({
    queryKey: ['auction', auctionId],
    queryFn: () => blockchainService.getAuctionDetails(auctionId),
    enabled: !!auctionId,
    staleTime: 10000,
  });
}

export function useAuctionBids(auctionId) {
  return useQuery({
    queryKey: ['auctionBids', auctionId],
    queryFn: () => blockchainService.getAuctionBids(auctionId),
    enabled: !!auctionId,
    staleTime: 5000,
  });
}

export function useEscrowDeal(dealId) {
  return useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => blockchainService.getDealDetails(dealId),
    enabled: !!dealId,
    staleTime: 10000,
  });
}

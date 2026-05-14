'use client';

import BookingMarketplace, {
  type MarketplaceProps,
} from './time-market/BookingMarketplace';

export type { MarketplaceProps };

export default function Marketplace(props: MarketplaceProps) {
  return <BookingMarketplace {...props} />;
}

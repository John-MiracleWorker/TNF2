export interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'subscription' | 'payment';
  features?: string[];
}

export const PRODUCTS: StripeProduct[] = [
  {
    priceId: 'price_1RWniVGWK1AYSv44HACsdk5J',
    name: 'TrueNorth Pro',
    description: 'Unlock advanced features and personalized spiritual guidance',
    mode: 'subscription',
    features: [
      'Unlimited AI conversations',
      'Advanced prayer tracking',
      'Personalized devotionals',
      'Scripture memory system',
      'Spiritual habit tracking',
      'Bible study tools',
      'Premium ElevenLabs voices',
      'Premium content library',
      'Priority support'
    ]
  }
];
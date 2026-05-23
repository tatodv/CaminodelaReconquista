/**
 * Vercel Web Analytics initialization
 * https://vercel.com/docs/analytics
 */
import { inject } from '@vercel/analytics';

// Initialize analytics
inject({
  mode: 'production',
  debug: false
});

/**
 * Read-only SP-API tool: order metrics (sales/units by interval).
 * Wraps GET /sales/v1/orderMetrics (Sales API v1).
 */

import { getSPAPIConfig } from '../config/sp-api.js';
import { SPAPIClient } from '../utils/sp-api-client.js';

export interface GetSalesMetricsParams {
  interval: string;
  granularity: 'Hour' | 'Day' | 'Week' | 'Month' | 'Year' | 'Total';
  marketplaceIds?: string[];
  buyerType?: 'B2B' | 'B2C' | 'All';
  fulfillmentNetwork?: 'AFN' | 'MFN';
  asin?: string;
  sku?: string;
  granularityTimeZone?: string;
}

export async function getSalesMetrics(params: GetSalesMetricsParams): Promise<unknown> {
  if (!params.interval) {
    throw new Error('interval is required');
  }
  if (!params.granularity) {
    throw new Error('granularity is required');
  }

  const config = getSPAPIConfig();
  const spApiConfig = config.getSPAPIConfig();

  const client = new SPAPIClient({
    endpoint: spApiConfig.endpoint,
    marketplaceId: spApiConfig.marketplaceId,
    awsCredentials: config.getAWSCredentials(),
    tokenManager: config.getTokenManager(),
  });

  const marketplaceIds = params.marketplaceIds ?? [spApiConfig.marketplaceId];

  const queryParams: Record<string, string | number | boolean> = {
    marketplaceIds: marketplaceIds.join(','),
    interval: params.interval,
    granularity: params.granularity,
  };

  if (params.buyerType) queryParams.buyerType = params.buyerType;
  if (params.fulfillmentNetwork) queryParams.fulfillmentNetwork = params.fulfillmentNetwork;
  if (params.asin) queryParams.asin = params.asin;
  if (params.sku) queryParams.sku = params.sku;
  if (params.granularityTimeZone) queryParams.granularityTimeZone = params.granularityTimeZone;

  const response = await client.request(
    {
      method: 'GET',
      path: '/sales/v1/orderMetrics',
      queryParams,
    },
    'default'
  );

  return response.data;
}

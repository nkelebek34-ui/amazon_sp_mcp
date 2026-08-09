/**
 * Read-only SP-API tool: FBA inventory summaries.
 * Wraps GET /fba/inventory/v1/summaries (FBA Inventory API v1).
 */

import { getSPAPIConfig } from '../config/sp-api.js';
import { SPAPIClient } from '../utils/sp-api-client.js';

export interface GetFbaInventoryParams {
  marketplaceId?: string;
  details?: boolean;
  sellerSkus?: string[];
  startDateTime?: string;
  nextToken?: string;
}

export async function getFbaInventory(params: GetFbaInventoryParams = {}): Promise<unknown> {
  const config = getSPAPIConfig();
  const spApiConfig = config.getSPAPIConfig();

  const client = new SPAPIClient({
    endpoint: spApiConfig.endpoint,
    marketplaceId: spApiConfig.marketplaceId,
    awsCredentials: config.getAWSCredentials(),
    tokenManager: config.getTokenManager(),
  });

  const marketplaceId = params.marketplaceId ?? spApiConfig.marketplaceId;

  const queryParams: Record<string, string | number | boolean> = {
    granularityType: 'Marketplace',
    granularityId: marketplaceId,
    marketplaceIds: marketplaceId,
    details: params.details ?? false,
  };

  if (params.sellerSkus && params.sellerSkus.length > 0) {
    queryParams.sellerSkus = params.sellerSkus.join(',');
  }
  if (params.startDateTime) queryParams.startDateTime = params.startDateTime;
  if (params.nextToken) queryParams.nextToken = params.nextToken;

  const response = await client.request(
    {
      method: 'GET',
      path: '/fba/inventory/v1/summaries',
      queryParams,
    },
    'inventory'
  );

  return response.data;
}

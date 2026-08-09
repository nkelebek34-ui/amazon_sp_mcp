/**
 * Read-only SP-API tool: list orders.
 * Wraps GET /orders/v0/orders (Orders API v0).
 */

import { getSPAPIConfig } from '../config/sp-api.js';
import { SPAPIClient } from '../utils/sp-api-client.js';

export interface GetOrdersParams {
  marketplaceIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  lastUpdatedAfter?: string;
  lastUpdatedBefore?: string;
  orderStatuses?: string[];
  maxResultsPerPage?: number;
  nextToken?: string;
}

export async function getOrders(params: GetOrdersParams = {}): Promise<unknown> {
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
    MarketplaceIds: marketplaceIds.join(','),
  };

  if (params.createdAfter) queryParams.CreatedAfter = params.createdAfter;
  if (params.createdBefore) queryParams.CreatedBefore = params.createdBefore;
  if (params.lastUpdatedAfter) queryParams.LastUpdatedAfter = params.lastUpdatedAfter;
  if (params.lastUpdatedBefore) queryParams.LastUpdatedBefore = params.lastUpdatedBefore;
  if (params.orderStatuses && params.orderStatuses.length > 0) {
    queryParams.OrderStatuses = params.orderStatuses.join(',');
  }
  if (params.maxResultsPerPage) queryParams.MaxResultsPerPage = params.maxResultsPerPage;
  if (params.nextToken) queryParams.NextToken = params.nextToken;

  const response = await client.request(
    {
      method: 'GET',
      path: '/orders/v0/orders',
      queryParams,
    },
    'orders'
  );

  return response.data;
}

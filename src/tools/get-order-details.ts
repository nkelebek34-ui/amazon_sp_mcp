/**
 * Read-only SP-API tool: order detail + line items.
 * Wraps GET /orders/v0/orders/{orderId} and GET /orders/v0/orders/{orderId}/orderItems.
 */

import { getSPAPIConfig } from '../config/sp-api.js';
import { SPAPIClient } from '../utils/sp-api-client.js';

export interface GetOrderDetailsParams {
  orderId: string;
}

export async function getOrderDetails(params: GetOrderDetailsParams): Promise<unknown> {
  if (!params.orderId) {
    throw new Error('orderId is required');
  }

  const config = getSPAPIConfig();
  const spApiConfig = config.getSPAPIConfig();

  const client = new SPAPIClient({
    endpoint: spApiConfig.endpoint,
    marketplaceId: spApiConfig.marketplaceId,
    awsCredentials: config.getAWSCredentials(),
    tokenManager: config.getTokenManager(),
  });

  const [orderResponse, itemsResponse] = await Promise.all([
    client.request(
      {
        method: 'GET',
        path: `/orders/v0/orders/${encodeURIComponent(params.orderId)}`,
      },
      'orders'
    ),
    client.request(
      {
        method: 'GET',
        path: `/orders/v0/orders/${encodeURIComponent(params.orderId)}/orderItems`,
      },
      'orders'
    ),
  ]);

  return {
    order: orderResponse.data,
    items: itemsResponse.data,
  };
}

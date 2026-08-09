#!/usr/bin/env node

/**
 * Amazon Seller Central MCP Server
 * Entry point for the Model Context Protocol server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { getOrders } from './tools/get-orders.js';
import { getOrderDetails } from './tools/get-order-details.js';
import { getFbaInventory } from './tools/get-fba-inventory.js';
import { getSalesMetrics } from './tools/get-sales-metrics.js';
import { requestReport, getReport } from './tools/report.js';

// Load environment variables
dotenv.config();

/**
 * MCP Server for Amazon Seller Central
 */
class AmazonSellerCentralServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'amazon-seller-central',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  /**
   * Set up request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'hello',
            description: 'A simple test tool that says hello',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name to greet',
                },
              },
            },
          },
          {
            name: 'get_orders',
            description: 'List Amazon orders (read-only, Orders API v0 GetOrders).',
            inputSchema: {
              type: 'object',
              properties: {
                marketplaceIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Marketplace IDs to query (defaults to MARKETPLACE_ID env var)',
                },
                createdAfter: { type: 'string', description: 'ISO 8601 timestamp' },
                createdBefore: { type: 'string', description: 'ISO 8601 timestamp' },
                lastUpdatedAfter: { type: 'string', description: 'ISO 8601 timestamp' },
                lastUpdatedBefore: { type: 'string', description: 'ISO 8601 timestamp' },
                orderStatuses: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'e.g. Shipped, Unshipped, PartiallyShipped, Canceled',
                },
                maxResultsPerPage: { type: 'number' },
                nextToken: { type: 'string' },
              },
            },
          },
          {
            name: 'get_order_details',
            description:
              'Get a single order plus its line items (read-only, Orders API v0).',
            inputSchema: {
              type: 'object',
              properties: {
                orderId: { type: 'string', description: 'Amazon Order ID' },
              },
              required: ['orderId'],
            },
          },
          {
            name: 'get_fba_inventory',
            description: 'Get FBA inventory summaries (read-only, FBA Inventory API v1).',
            inputSchema: {
              type: 'object',
              properties: {
                marketplaceId: {
                  type: 'string',
                  description: 'Defaults to MARKETPLACE_ID env var',
                },
                details: { type: 'boolean', description: 'Include detailed inventory fields' },
                sellerSkus: { type: 'array', items: { type: 'string' } },
                startDateTime: { type: 'string', description: 'ISO 8601 timestamp' },
                nextToken: { type: 'string' },
              },
            },
          },
          {
            name: 'get_sales_metrics',
            description: 'Get order metrics (sales/units by interval, read-only, Sales API v1).',
            inputSchema: {
              type: 'object',
              properties: {
                interval: {
                  type: 'string',
                  description:
                    'ISO 8601 interval, e.g. 2026-08-01T00:00:00-00:00--2026-08-08T00:00:00-00:00',
                },
                granularity: {
                  type: 'string',
                  enum: ['Hour', 'Day', 'Week', 'Month', 'Year', 'Total'],
                },
                marketplaceIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Defaults to MARKETPLACE_ID env var',
                },
                buyerType: { type: 'string', enum: ['B2B', 'B2C', 'All'] },
                fulfillmentNetwork: { type: 'string', enum: ['AFN', 'MFN'] },
                asin: { type: 'string' },
                sku: { type: 'string' },
                granularityTimeZone: { type: 'string' },
              },
              required: ['interval', 'granularity'],
            },
          },
          {
            name: 'request_report',
            description:
              'Request an SP-API report (Reports API v2021-06-30). Creates a report generation job on Amazon\'s side; does not mutate orders, prices, or inventory. Returns a reportId — poll with get_report.',
            inputSchema: {
              type: 'object',
              properties: {
                reportType: { type: 'string', description: 'e.g. GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL' },
                marketplaceIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Defaults to MARKETPLACE_ID env var',
                },
                dataStartTime: { type: 'string', description: 'ISO 8601 timestamp' },
                dataEndTime: { type: 'string', description: 'ISO 8601 timestamp' },
              },
              required: ['reportType'],
            },
          },
          {
            name: 'get_report',
            description:
              'Check an SP-API report\'s status; when DONE, downloads and returns the report document content (read-only).',
            inputSchema: {
              type: 'object',
              properties: {
                reportId: { type: 'string' },
              },
              required: ['reportId'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'hello') {
        const userName = (args as { name?: string }).name || 'World';
        return {
          content: [
            {
              type: 'text',
              text: `Hello, ${userName}! 🚀\n\nAmazon Seller Central MCP Server is running successfully!\n\nPhase 1.2 Complete: TypeScript/Node.js setup verified.`,
            },
          ],
        };
      }

      if (name === 'get_orders') {
        const result = await getOrders(args as Parameters<typeof getOrders>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }

      if (name === 'get_order_details') {
        const result = await getOrderDetails(
          args as unknown as Parameters<typeof getOrderDetails>[0]
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }

      if (name === 'get_fba_inventory') {
        const result = await getFbaInventory(args as Parameters<typeof getFbaInventory>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }

      if (name === 'get_sales_metrics') {
        const result = await getSalesMetrics(
          args as unknown as Parameters<typeof getSalesMetrics>[0]
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }

      if (name === 'request_report') {
        const result = await requestReport(
          args as unknown as Parameters<typeof requestReport>[0]
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }

      if (name === 'get_report') {
        const result = await getReport(args as unknown as Parameters<typeof getReport>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Amazon Seller Central MCP Server running on stdio');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const server = new AmazonSellerCentralServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

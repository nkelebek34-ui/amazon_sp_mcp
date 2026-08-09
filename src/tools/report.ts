/**
 * SP-API Reports (v2021-06-30): request a report, poll its status, and
 * fetch the resulting document once ready. requestReport creates a report
 * job on Amazon's side but does not mutate any business data (orders,
 * prices, inventory) — it only asks Amazon to generate a read-only report.
 */

import axios from 'axios';
import { gunzipSync } from 'node:zlib';
import { getSPAPIConfig } from '../config/sp-api.js';
import { SPAPIClient } from '../utils/sp-api-client.js';

export interface RequestReportParams {
  reportType: string;
  marketplaceIds?: string[];
  dataStartTime?: string;
  dataEndTime?: string;
}

export interface RequestReportResult {
  reportId: string;
}

export async function requestReport(params: RequestReportParams): Promise<RequestReportResult> {
  if (!params.reportType) {
    throw new Error('reportType is required');
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

  const body: Record<string, unknown> = {
    reportType: params.reportType,
    marketplaceIds,
  };
  if (params.dataStartTime) body.dataStartTime = params.dataStartTime;
  if (params.dataEndTime) body.dataEndTime = params.dataEndTime;

  const response = await client.request<{ reportId: string }>(
    {
      method: 'POST',
      path: '/reports/2021-06-30/reports',
      body,
    },
    'reports'
  );

  return { reportId: response.data.reportId };
}

export interface GetReportParams {
  reportId: string;
}

export interface GetReportResult {
  processingStatus: string;
  reportId: string;
  reportType?: string;
  reportDocumentId?: string;
  document?: {
    reportDocumentId: string;
    content: string;
  };
}

interface ReportStatusResponse {
  reportId: string;
  reportType?: string;
  processingStatus: string;
  reportDocumentId?: string;
}

interface ReportDocumentResponse {
  reportDocumentId: string;
  url: string;
  compressionAlgorithm?: string;
}

export async function getReport(params: GetReportParams): Promise<GetReportResult> {
  if (!params.reportId) {
    throw new Error('reportId is required');
  }

  const config = getSPAPIConfig();
  const spApiConfig = config.getSPAPIConfig();

  const client = new SPAPIClient({
    endpoint: spApiConfig.endpoint,
    marketplaceId: spApiConfig.marketplaceId,
    awsCredentials: config.getAWSCredentials(),
    tokenManager: config.getTokenManager(),
  });

  const statusResponse = await client.request<ReportStatusResponse>(
    {
      method: 'GET',
      path: `/reports/2021-06-30/reports/${encodeURIComponent(params.reportId)}`,
    },
    'reports'
  );

  const status = statusResponse.data;

  const result: GetReportResult = {
    processingStatus: status.processingStatus,
    reportId: status.reportId,
    reportType: status.reportType,
    reportDocumentId: status.reportDocumentId,
  };

  if (status.processingStatus === 'DONE' && status.reportDocumentId) {
    const docResponse = await client.request<ReportDocumentResponse>(
      {
        method: 'GET',
        path: `/reports/2021-06-30/documents/${encodeURIComponent(status.reportDocumentId)}`,
      },
      'reports'
    );

    const doc = docResponse.data;
    const downloaded = await axios.get<ArrayBuffer>(doc.url, {
      responseType: 'arraybuffer',
    });

    const rawBuffer = Buffer.from(downloaded.data);
    const content =
      doc.compressionAlgorithm === 'GZIP'
        ? gunzipSync(rawBuffer).toString('utf-8')
        : rawBuffer.toString('utf-8');

    result.document = {
      reportDocumentId: doc.reportDocumentId,
      content,
    };
  }

  return result;
}

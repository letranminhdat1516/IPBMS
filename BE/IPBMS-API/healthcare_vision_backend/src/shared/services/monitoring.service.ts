import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  // Report a custom metric. Currently logs and can be extended to push to
  // Prometheus/Datadog/Loki depending on environment variables.
  async reportMetric(name: string, value: number, labels?: Record<string, string>) {
    // Minimal implementation: structured log. Integrate with real metrics exporter as needed.
    this.logger.debug({ metric: name, value, labels });
  }

  // Report an alert-worthy event. Extend to create pager/notification via webhook if required.
  async alert(name: string, info: Record<string, any>) {
    this.logger.warn({ alert: name, info });

    // Integrate with Slack webhook for alerting
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        const message = {
          text: `🚨 Alert: ${name}`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🚨 ${name}`,
              },
            },
            {
              type: 'section',
              fields: Object.entries(info).map(([key, value]) => ({
                type: 'mrkdwn',
                text: `*${key}:* ${JSON.stringify(value)}`,
              })),
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Alert generated at ${new Date().toISOString()}`,
                },
              ],
            },
          ],
        };

        await axios.post(slackWebhookUrl, message, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });

        this.logger.log(`Alert sent to Slack: ${name}`);
      } catch (error) {
        this.logger.error(
          `Failed to send Slack alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    } else {
      this.logger.warn('SLACK_WEBHOOK_URL not configured, alert logged only');
    }
  }
}

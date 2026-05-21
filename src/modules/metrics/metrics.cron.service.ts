import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricsBuffer } from './metrics.buffer';
import { MetricSnapshot } from './entities/metric-snapshot.entity';

@Injectable()
export class MetricsCronService {
  private readonly logger = new Logger(MetricsCronService.name);

  constructor(
    private readonly buffer: MetricsBuffer,
    @InjectRepository(MetricSnapshot)
    private readonly repo: Repository<MetricSnapshot>,
  ) {}

  @Cron('*/30 * * * * *')
  async flush(): Promise<void> {
    const records = this.buffer.flush();

    if (records.length === 0) return;

    const durations = records.map((r) => r.durationMs).sort((a, b) => a - b);
    const errorCount = records.filter((r) => r.statusCode >= 400).length;
    const total = records.length;
    const avg = durations.reduce((a, b) => a + b, 0) / total;
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
    const errorRate = errorCount / total;

    const pathCounts = records.reduce(
      (acc, r) => {
        acc[r.path] = (acc[r.path] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topEndpoints = Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));

    // Write all metrics for this window in one batch
    const snapshots = [
      { metricName: 'avg_response_time', value: Math.round(avg), labels: null },
      { metricName: 'p95_response_time', value: Math.round(p95), labels: null },
      { metricName: 'error_rate', value: errorRate, labels: null },
      { metricName: 'total_requests', value: total, labels: null },
      {
        metricName: 'top_endpoints',
        value: 0,
        labels: { endpoints: topEndpoints },
      },
    ].map((s) => this.repo.create({ ...s, windowSeconds: 30 }));

    await this.repo.save(snapshots);
    this.logger.debug(`Flushed data window: ${total} requests processed.`);
  }
}

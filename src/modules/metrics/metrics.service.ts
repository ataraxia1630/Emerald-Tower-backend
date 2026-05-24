import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricSnapshot } from './entities/metric-snapshot.entity';
import { QueryMetricsDto } from './dto/query-metrics.dto';

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(MetricSnapshot)
    private readonly repo: Repository<MetricSnapshot>,
  ) {}

  // Returns time-series data grouped by metric name
  // Shape: { metricName: [ { timestamp, value, labels } ] }
  async getTimeSeries(dto: QueryMetricsDto) {
    const hours = Math.min(dto.hours ?? 24, 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.createdAt >= :since', { since })
      .orderBy('s.createdAt', 'ASC');

    if (dto.metricName) {
      qb.andWhere('s.metricName = :name', { name: dto.metricName });
    }

    const rows = await qb.getMany();

    // Group into { metricName → datapoints[] } for Recharts
    return rows.reduce(
      (acc, row) => {
        if (!acc[row.metricName]) acc[row.metricName] = [];
        acc[row.metricName].push({
          timestamp: row.createdAt.toISOString(),
          value: row.value,
          labels: row.labels,
        });
        return acc;
      },
      {} as Record<string, { timestamp: string; value: number; labels: any }[]>,
    );
  }

  async getLatest() {
    const metrics = [
      'avg_response_time',
      'p95_response_time',
      'error_rate',
      'total_requests',
      'top_endpoints',
    ];

    const results = await Promise.all(
      metrics.map((name) =>
        this.repo.findOne({
          where: { metricName: name },
          order: { createdAt: 'DESC' },
        }),
      ),
    );

    return Object.fromEntries(
      metrics.map((name, i) => [name, results[i] ?? null]),
    );
  }
}

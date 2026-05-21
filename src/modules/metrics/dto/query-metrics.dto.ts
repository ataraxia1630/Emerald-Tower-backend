import { IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMetricsDto {
  @IsOptional()
  @Type(() => Number)
  hours?: number = 24;

  @IsOptional()
  @IsIn([
    'avg_response_time',
    'p95_response_time',
    'error_rate',
    'total_requests',
    'top_endpoints',
  ])
  metricName?: string;
}

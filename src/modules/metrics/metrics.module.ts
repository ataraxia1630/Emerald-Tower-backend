import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricSnapshot } from './entities/metric-snapshot.entity';
import { MetricsBuffer } from './metrics.buffer';
import { MetricsCronService } from './metrics.cron.service';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from '../../interceptors/metrics.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([MetricSnapshot])],
  controllers: [MetricsController],
  providers: [
    MetricsBuffer,
    MetricsCronService,
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsBuffer],
})
export class MetricsModule {}

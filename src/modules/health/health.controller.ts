import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('ADMIN - System Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Active health check for all system components' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () =>
        this.http.pingCheck(
          'vnpay-gateway',
          'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
          { timeout: 5000 },
        ),
      () => this.memory.checkHeap('memory-heap', 500 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk-storage', {
          thresholdPercent: 0.9,
          path: '/',
        }),
    ]);
  }
}

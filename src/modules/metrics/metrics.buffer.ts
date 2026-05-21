import { Injectable } from '@nestjs/common';

export interface RequestRecord {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

@Injectable()
export class MetricsBuffer {
  private records: RequestRecord[] = [];

  push(record: RequestRecord): void {
    this.records.push(record);
  }

  flush(): RequestRecord[] {
    const snapshot = [...this.records];
    this.records = [];
    return snapshot;
  }

  get size(): number {
    return this.records.length;
  }
}

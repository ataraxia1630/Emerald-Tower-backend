import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetricSnapshot1779372459610 implements MigrationInterface {
  name = 'CreateMetricSnapshot1779372459610';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE metric_snapshots (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "metricName"    VARCHAR NOT NULL,
        value           FLOAT   NOT NULL,
        labels          JSONB,
        "windowSeconds" INTEGER NOT NULL DEFAULT 30,
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_metric_name_time ON metric_snapshots ("metricName", "createdAt" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS metric_snapshots;`);
  }
}

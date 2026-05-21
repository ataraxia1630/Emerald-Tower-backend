import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('metric_snapshots')
@Index(['metricName', 'createdAt'])
export class MetricSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  metricName: string;

  @Column('float')
  value: number;

  @Column({ type: 'jsonb', nullable: true })
  labels: Record<string, any> | null;

  @Column({ default: 30 })
  windowSeconds: number;

  @CreateDateColumn()
  createdAt: Date;
}

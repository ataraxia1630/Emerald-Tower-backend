import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

import { Backup, BackupStatus, BackupType } from './entities/backup.entity';
import { RestoreJob, RestoreStatus } from './entities/restore-job.entity';
import { ConfirmRestoreDto } from './dto/confirm-restore.dto';
import { Readable } from 'stream';
import { BackupStorageService } from './backup-storage.service';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'backups');

  constructor(
    @InjectRepository(Backup)
    private readonly backupRepo: Repository<Backup>,
    @InjectRepository(RestoreJob)
    private readonly restoreRepo: Repository<RestoreJob>,
    private readonly backupStorage: BackupStorageService, // ← đổi tên
  ) {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // ─── SCHEDULED: chạy 2AM mỗi ngày ───────────────────────────────────────
  // @Cron('0 2 * * *', { name: 'daily-backup', timeZone: 'Asia/Ho_Chi_Minh' })
  // Đổi thành (chạy sau 1 phút kể từ lúc start server):
  // @Cron('*/1 * * * *', { name: 'daily-backup', timeZone: 'Asia/Ho_Chi_Minh' })
  @Cron('0 16 * * *', { name: 'daily-backup', timeZone: 'Asia/Ho_Chi_Minh' })
  async runScheduledBackup(): Promise<void> {
    this.logger.log('Scheduled backup started');
    await this.createBackup(BackupType.SCHEDULED, 'system');
  }

  // ─── LIST ─────────────────────────────────────────────────────────────────
  findAll(): Promise<Backup[]> {
    return this.backupRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Backup> {
    const backup = await this.backupRepo.findOne({ where: { id } });
    if (!backup)
      throw new HttpException(
        `Backup ID ${id} không tồn tại`,
        HttpStatus.NOT_FOUND,
      );
    return backup;
  }

  // ─── CREATE BACKUP ────────────────────────────────────────────────────────
  async createManualBackup(initiatedBy: string): Promise<Backup> {
    const backup = await this.backupRepo.save(
      this.backupRepo.create({
        type: BackupType.MANUAL,
        status: BackupStatus.PENDING,
        initiatedBy,
      }),
    );

    // Chạy background — trả về PENDING ngay
    this.createBackup(BackupType.MANUAL, initiatedBy, backup).catch((err) =>
      this.logger.error(`Backup ${backup.id} crashed: ${String(err)}`),
    );

    return backup;
  }

  private async createBackup(
    type: BackupType,
    initiatedBy: string,
    existingBackup?: Backup,
  ): Promise<void> {
    // Tạo record nếu chưa có (scheduled backup)
    const backup =
      existingBackup ??
      (await this.backupRepo.save(
        this.backupRepo.create({
          type,
          status: BackupStatus.PENDING,
          initiatedBy,
        }),
      ));

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${ts}-id${backup.id}.sql`;
    const tempFilePath = path.join(this.tempDir, fileName);

    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT ?? '5432';
    const user = process.env.DB_USERNAME;
    const password = process.env.DB_PASSWORD;
    const dbName = process.env.DB_NAME;

    try {
      // 1. pg_dump ra file tạm
      await execAsync(
        `PGSSLMODE=require PGPASSWORD=${password} pg_dump` +
          ` -h ${host}` +
          ` -p ${port}` +
          ` -U ${user}` +
          ` -d ${dbName}` +
          ` --no-owner --no-acl` +
          ` --clean --if-exists` + // ← drop an toàn trước khi recreate
          ` -f ${tempFilePath}`,
      );

      // 2. Tính checksum SHA-256
      const checksum = await this.calcChecksum(tempFilePath);
      const sizeBytes = fs.statSync(tempFilePath).size;

      // 3. Upload lên Supabase Storage
      const fileBuffer = fs.readFileSync(tempFilePath);
      const storagePath = await this.backupStorage.uploadBackup(
        fileBuffer,
        fileName,
      );

      // Cập nhật record — KHÔNG có downloadUrl
      await this.backupRepo.update(backup.id, {
        status: BackupStatus.SUCCESS,
        storagePath,
        checksum,
        sizeBytes,
      });

      this.logger.log(`Backup ${backup.id} SUCCESS — ${sizeBytes} bytes`);
    } catch (err) {
      await this.backupRepo.update(backup.id, {
        status: BackupStatus.FAILED,
        errorMessage: String(err),
      });
      this.logger.error(`❌ Backup ${backup.id} FAILED: ${String(err)}`);
    } finally {
      // Xóa file tạm dù thành công hay thất bại
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  // ─── VERIFY CHECKSUM ──────────────────────────────────────────────────────
  async verifyChecksum(
    id: number,
  ): Promise<{ valid: boolean; backup: Backup }> {
    const backup = await this.findOne(id);

    if (backup.status !== BackupStatus.SUCCESS)
      throw new HttpException(
        'Chỉ verify được backup có status SUCCESS',
        HttpStatus.BAD_REQUEST,
      );

    const tempFilePath = path.join(this.tempDir, `verify-${backup.id}.sql`);

    try {
      const buffer = await this.backupStorage.downloadBackup(
        backup.storagePath,
      );
      fs.writeFileSync(tempFilePath, buffer);

      // So sánh checksum
      const currentChecksum = await this.calcChecksum(tempFilePath);
      const valid = currentChecksum === backup.checksum;

      if (!valid) {
        await this.backupRepo.update(id, { status: BackupStatus.INVALID });
        backup.status = BackupStatus.INVALID;
      }

      return { valid, backup };
    } finally {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
  }

  // ─── RESTORE ──────────────────────────────────────────────────────────────
  async initiateRestore(
    backupId: number,
    dto: ConfirmRestoreDto,
    initiatedBy: string,
  ): Promise<RestoreJob> {
    if (!dto.confirmed)
      throw new HttpException(
        'Phải xác nhận restore (confirmed: true)',
        HttpStatus.BAD_REQUEST,
      );

    const backup = await this.findOne(backupId);

    if (backup.status !== BackupStatus.SUCCESS)
      throw new HttpException(
        'Chỉ restore từ backup có status SUCCESS',
        HttpStatus.BAD_REQUEST,
      );

    const job = await this.restoreRepo.save(
      this.restoreRepo.create({
        backupId,
        status: RestoreStatus.PENDING,
        initiatedBy,
      }),
    );

    // Chạy background
    this.runRestore(job, backup).catch((err) =>
      this.logger.error(`Restore job ${job.id} crashed: ${String(err)}`),
    );

    return job;
  }

  async getDownloadUrl(backupId: number): Promise<string> {
    const backup = await this.findOne(backupId);

    if (backup.status !== BackupStatus.SUCCESS)
      throw new HttpException('Backup chưa sẵn sàng', HttpStatus.BAD_REQUEST);

    return this.backupStorage.createSignedUrl(backup.storagePath, 300); // 5 phút
  }

  private async runRestore(job: RestoreJob, backup: Backup): Promise<void> {
    const restoreDb = process.env.RESTORE_DB_NAME || process.env.DB_NAME;

    // ❌ chặn restore vào production
    if (
      process.env.NODE_ENV === 'production' &&
      restoreDb === process.env.DB_NAME
    ) {
      throw new Error('❌ Không cho phép restore vào production DB');
    }

    await this.restoreRepo.update(job.id, {
      status: RestoreStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    const tempFilePath = path.join(this.tempDir, `restore-job${job.id}.sql`);

    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT ?? '5432';
    const user = process.env.DB_USERNAME;
    const password = process.env.DB_PASSWORD;

    this.logger.warn(`⚠️ Restoring to DB: ${restoreDb}`);

    try {
      // 1. Download backup
      const buffer = await this.backupStorage.downloadBackup(
        backup.storagePath,
      );
      fs.writeFileSync(tempFilePath, buffer);

      // 2. Verify checksum
      const checksum = await this.calcChecksum(tempFilePath);
      if (checksum !== backup.checksum) {
        throw new Error('Checksum mismatch — file bị corrupt');
      }

      // 3. Restore (transaction-safe)
      await execAsync(
        `psql \
      "host=${host} port=${port} user=${user} dbname=${restoreDb} sslmode=require" \
      --single-transaction \
      -v ON_ERROR_STOP=1 \
      -f ${tempFilePath}`,
        {
          env: {
            ...process.env,
            PGPASSWORD: password, // an toàn hơn inline
          },
        },
      );

      // 4. Fix search_path sau restore
      try {
        await execAsync(
          `psql \
    "host=${host} port=${port} user=${user} dbname=${restoreDb} sslmode=require" \
    -c "ALTER DATABASE ${restoreDb} SET search_path TO public;"`,
          {
            env: { ...process.env, PGPASSWORD: password },
          },
        );
        this.logger.log(`✅ search_path fixed for ${restoreDb}`);
      } catch (err) {
        this.logger.error(`❌ search_path fix failed: ${String(err)}`);
      }

      await this.restoreRepo.update(job.id, {
        status: RestoreStatus.SUCCESS,
        completedAt: new Date(),
      });

      this.logger.log(`✅ Restore job ${job.id} SUCCESS`);
    } catch (err) {
      await this.restoreRepo.update(job.id, {
        status: RestoreStatus.FAILED,
        completedAt: new Date(),
        errorMessage: String(err),
      });

      this.logger.error(`❌ Restore job ${job.id} FAILED: ${String(err)}`);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  async getRestoreJob(jobId: number): Promise<RestoreJob> {
    const job = await this.restoreRepo.findOne({
      where: { id: jobId },
      relations: ['backup'],
    });
    if (!job)
      throw new HttpException(
        `Restore job ${jobId} không tồn tại`,
        HttpStatus.NOT_FOUND,
      );
    return job;
  }

  // ─── HELPER ───────────────────────────────────────────────────────────────
  private calcChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}

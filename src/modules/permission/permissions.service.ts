import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RolePermission,
  SystemModule,
} from './entities/role-permission.entity';
import { UserRole } from '../accounts/enums/user-role.enum';
import {
  UpdatePermissionEntryDto,
  BulkUpdatePermissionsDto,
} from './dto/update-permission.dto';

// Default matrix theo BRD Security Matrix (UC38)
const BRD_DEFAULT_MATRIX: UpdatePermissionEntryDto[] = [
  // SYS_ADMIN — full access on system module, read-only on others
  {
    role: UserRole.ADMIN,
    module: SystemModule.SYSTEM_ADMIN,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: true,
    canExport: true,
    canDelete: true,
  },
  {
    role: UserRole.ADMIN,
    module: SystemModule.RESIDENT_APARTMENT,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.ADMIN,
    module: SystemModule.INVOICE_DEBT,
    canView: true,
    canCreate: false,
    canEdit: false,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.ADMIN,
    module: SystemModule.AMENITY_BOOKING,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.ADMIN,
    module: SystemModule.REPORTING,
    canView: true,
    canCreate: false,
    canEdit: false,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },

  // OPERATIONS — operational day-to-day modules
  {
    role: UserRole.OPERATIONS,
    module: SystemModule.RESIDENT_APARTMENT,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.OPERATIONS,
    module: SystemModule.INVOICE_DEBT,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: true,
    canDelete: false,
  },
  {
    role: UserRole.OPERATIONS,
    module: SystemModule.ASSET_EQUIPMENT,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.OPERATIONS,
    module: SystemModule.MAINTENANCE,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: true,
    canDelete: false,
  },
  {
    role: UserRole.OPERATIONS,
    module: SystemModule.FEEDBACK,
    canView: true,
    canCreate: false,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.OPERATIONS,
    module: SystemModule.AMENITY_BOOKING,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.OPERATIONS,
    module: SystemModule.NOTIFICATIONS_VOTING,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.OPERATIONS,
    module: SystemModule.REPORTING,
    canView: true,
    canCreate: true,
    canEdit: false,
    canApprove: false,
    canExport: true,
    canDelete: false,
  },

  // MANAGEMENT_BOARD — oversight + approve
  {
    role: UserRole.MANAGEMENT_BOARD,
    module: SystemModule.INVOICE_DEBT,
    canView: true,
    canCreate: false,
    canEdit: false,
    canApprove: true,
    canExport: true,
    canDelete: false,
  },
  {
    role: UserRole.MANAGEMENT_BOARD,
    module: SystemModule.MAINTENANCE,
    canView: true,
    canCreate: false,
    canEdit: false,
    canApprove: true,
    canExport: true,
    canDelete: false,
  },
  {
    role: UserRole.MANAGEMENT_BOARD,
    module: SystemModule.NOTIFICATIONS_VOTING,
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.MANAGEMENT_BOARD,
    module: SystemModule.REPORTING,
    canView: true,
    canCreate: true,
    canEdit: false,
    canApprove: false,
    canExport: true,
    canDelete: false,
  },

  // RESIDENT — self-service
  {
    role: UserRole.RESIDENT,
    module: SystemModule.RESIDENT_APARTMENT,
    canView: true,
    canCreate: false,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.RESIDENT,
    module: SystemModule.INVOICE_DEBT,
    canView: true,
    canCreate: false,
    canEdit: false,
    canApprove: true,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.RESIDENT,
    module: SystemModule.FEEDBACK,
    canView: true,
    canCreate: true,
    canEdit: false,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.RESIDENT,
    module: SystemModule.AMENITY_BOOKING,
    canView: true,
    canCreate: true,
    canEdit: false,
    canApprove: false,
    canExport: false,
    canDelete: false,
  },
  {
    role: UserRole.RESIDENT,
    module: SystemModule.NOTIFICATIONS_VOTING,
    canView: true,
    canCreate: false,
    canEdit: false,
    canApprove: true,
    canExport: false,
    canDelete: false,
  },
];

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly permRepo: Repository<RolePermission>,
  ) {}

  // 1. Khai báo biến lưu cache ngay trong bộ nhớ RAM của Service
  private matrixCache: Record<string, Record<string, any>> | null = null;

  /** Toàn bộ matrix dưới dạng: { [role]: { [module]: { canView, ... } } } */
  async getMatrix(): Promise<Record<string, Record<string, object>>> {
    // 2. Nếu trong RAM đã có dữ liệu, trả về NGAY LẬP TỨC (Mất 0ms, không chạm vào DB)
    if (this.matrixCache) {
      return this.matrixCache;
    }

    const rows = await this.permRepo.find({
      order: { role: 'ASC', module: 'ASC' },
    });

    const matrix: Record<string, Record<string, object>> = {};
    for (const row of rows) {
      matrix[row.role] ??= {};
      matrix[row.role][row.module] = {
        canView: row.canView ?? false,
        canCreate: row.canCreate ?? false,
        canEdit: row.canEdit ?? false,
        canApprove: row.canApprove ?? false,
        canExport: row.canExport ?? false,
        canDelete: row.canDelete ?? false,
      };
    }
    this.matrixCache = matrix;
    return matrix;
  }

  // 4. Tạo một hàm phụ để xóa bộ đệm khi dữ liệu bị thay đổi
  private clearCache() {
    this.matrixCache = null;
  }

  /** Upsert 1 entry role + module */
  async updateOne(dto: UpdatePermissionEntryDto): Promise<RolePermission> {
    let row = await this.permRepo.findOne({
      where: { role: dto.role, module: dto.module },
    });

    if (!row) {
      row = this.permRepo.create({ role: dto.role, module: dto.module });
    }

    // Chỉ ghi đè field nào được gửi lên
    if (dto.canView !== undefined) row.canView = dto.canView;
    if (dto.canCreate !== undefined) row.canCreate = dto.canCreate;
    if (dto.canEdit !== undefined) row.canEdit = dto.canEdit;
    if (dto.canApprove !== undefined) row.canApprove = dto.canApprove;
    if (dto.canExport !== undefined) row.canExport = dto.canExport;
    if (dto.canDelete !== undefined) row.canDelete = dto.canDelete;

    this.clearCache(); // 5. Xóa cache sau khi update thành công

    return this.permRepo.save(row);
  }

  /** Bulk upsert nhiều entries cùng lúc */
  async bulkUpdate(
    dto: BulkUpdatePermissionsDto,
  ): Promise<{ updated: number }> {
    if (!dto.permissions || dto.permissions.length === 0) return { updated: 0 };

    // Thực hiện UPSERT trong 1 câu lệnh SQL duy nhất
    await this.permRepo.upsert(dto.permissions, {
      conflictPaths: ['role', 'module'], // Đảm bảo bạn đã tạo Composite Unique Index cho 2 trường này trong Entity
      skipUpdateIfNoValuesChanged: true, // Tối ưu hóa nếu data gửi lên trùng data cũ
    });

    this.clearCache(); // 6. Xóa cache sau khi bulk update thành công
    return { updated: dto.permissions.length };
  }

  /** Seed matrix mặc định từ BRD. Safe to run nhiều lần (upsert). */
  async seedDefaultMatrix(): Promise<{ seeded: number }> {
    await this.permRepo.upsert(BRD_DEFAULT_MATRIX, {
      conflictPaths: ['role', 'module'],
    });
    return { seeded: BRD_DEFAULT_MATRIX.length };
  }
}

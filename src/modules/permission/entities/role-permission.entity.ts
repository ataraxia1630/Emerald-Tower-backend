import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { UserRole } from '../../accounts/enums/user-role.enum';

// Các module theo BRD Security Matrix (UC38)
export enum SystemModule {
  // Quản lý tài khoản & Hệ thống tối cao
  SYSTEM_ADMIN = 'SYSTEM_ADMIN', // map với module 'accounts', 'permission', 'backup', 'audit'

  // Phân hệ Cư dân & Căn hộ
  RESIDENT_APARTMENT = 'RESIDENT_APARTMENT', // map với module 'residents', 'apartments', 'blocks'

  // Phân hệ Hóa đơn, Chi phí & Thanh toán
  INVOICE_DEBT = 'INVOICE_DEBT', // map với module 'invoices', 'fees', 'payments'

  // Phân hệ Tài sản & Thiết bị
  ASSET_EQUIPMENT = 'ASSET_EQUIPMENT', // map với module 'assets', 'asset-types'

  // Phân hệ Bảo trì, Sửa chữa & Kỹ thuật viên
  MAINTENANCE = 'MAINTENANCE', // map với module 'maintenance-tickets', 'technicians'

  // Phân hệ Ý kiến & Phản hồi
  FEEDBACK = 'FEEDBACK', // map với module 'issues'

  // Phân hệ Đặt chỗ Tiện ích
  AMENITY_BOOKING = 'AMENITY_BOOKING', // map với module 'bookings', 'AMENITYs'

  // Phân hệ Thông báo & Khảo sát/Bình chọn
  NOTIFICATIONS_VOTING = 'NOTIFICATIONS_VOTING', // map với module 'notifications', 'system-notifications', 'votings'

  // Phân hệ Báo cáo & Thống kê
  REPORTING = 'REPORTING', // map với module 'reports'
}

@Entity('role_permissions')
@Unique(['role', 'module']) // 1 row duy nhất cho mỗi cặp role + module
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  role: UserRole;

  @Column({ type: 'varchar' })
  module: SystemModule;

  @Column({ type: 'boolean', default: false, name: 'can_view' })
  canView: boolean;

  @Column({ type: 'boolean', default: false, name: 'can_create' })
  canCreate: boolean;

  @Column({ type: 'boolean', default: false, name: 'can_edit' })
  canEdit: boolean;

  @Column({ type: 'boolean', default: false, name: 'can_approve' })
  canApprove: boolean;

  @Column({ type: 'boolean', default: false, name: 'can_export' })
  canExport: boolean;

  @Column({ type: 'boolean', default: false, name: 'can_delete' })
  canDelete: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

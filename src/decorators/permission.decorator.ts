import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'permission:module';
export const ACTION_KEY = 'permission:action';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// 1. Gắn cái này ở trên đầu Controller để định danh Module
export const RequireModule = (module: string) =>
  SetMetadata(MODULE_KEY, module);

// 2. Gắn cái này ở API nếu muốn GHI ĐÈ action tự động
export const RequireAction = (
  action:
    | 'canView'
    | 'canCreate'
    | 'canEdit'
    | 'canApprove'
    | 'canExport'
    | 'canDelete',
) => SetMetadata(ACTION_KEY, action);

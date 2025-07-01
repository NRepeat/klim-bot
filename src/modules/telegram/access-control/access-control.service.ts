import { Injectable } from '@nestjs/common';
import { RequestService } from 'src/modules/request/request.service';
import { UserService } from 'src/modules/user/user.service';
import { FullRequestType } from 'src/types/types';

export interface AccessCheckResult {
  allowed: boolean;
  message?: string;
}

@Injectable()
export class AccessControlService {
  constructor(
    private readonly requestService: RequestService,
    private readonly userService: UserService,
  ) {}

  /**
   * Проверяет, может ли пользователь принять заявку
   */
  async canAcceptRequest(
    requestId: string,
    telegramUserId: number,
  ): Promise<AccessCheckResult> {
    try {
      const request = await this.requestService.findById(requestId);
      if (!request) {
        return { allowed: false, message: '❌ Заявка не найдена' };
      }

      // Проверка что заявка еще не принята
      if (request.activeUser) {
        if (Number(request.activeUser.telegramId) !== telegramUserId) {
          return {
            allowed: false,
            message: '❌ Заявка уже принята другим пользователем',
          };
        }
      }

      // Проверка что пользователь является воркером
      const user = await this.userService.findByTelegramId(telegramUserId);
      if (!user) {
        return { allowed: false, message: '❌ Пользователь не найден' };
      }

      if (!user.Role.some((role) => role.id === '0' || role.id === '1')) {
        return {
          allowed: false,
          message: '❌ У вас нет прав для принятия заявок',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error in canAcceptRequest:', error);
      return {
        allowed: false,
        message: '❌ Произошла ошибка при проверке прав доступа',
      };
    }
  }

  /**
   * Проверяет, может ли пользователь выполнять действия с заявкой (отмена, перевод и т.д.)
   */
  async canManageRequest(
    requestId: string,
    telegramUserId: number,
  ): Promise<AccessCheckResult> {
    try {
      const request = await this.requestService.findById(requestId);
      if (!request) {
        return { allowed: false, message: '❌ Заявка не найдена' };
      }

      // Проверка что пользователь является активным обработчиком заявки
      if (!request.activeUser) {
        return {
          allowed: false,
          message: '❌ Заявка не назначена ни одному пользователю',
        };
      }

      if (Number(request.activeUser.telegramId) !== telegramUserId) {
        return {
          allowed: false,
          message: '❌ Эта заявка назначена другому пользователю',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error in canManageRequest:', error);
      return {
        allowed: false,
        message: '❌ Произошла ошибка при проверке прав доступа',
      };
    }
  }

  /**
   * Проверяет, является ли пользователь администратором
   */
  async isAdmin(telegramUserId: number): Promise<AccessCheckResult> {
    try {
      const user = await this.userService.findByTelegramId(telegramUserId);
      if (!user) {
        return { allowed: false, message: '❌ Пользователь не найден' };
      }

      if (user.Role.find((role) => role.id === '1') === undefined) {
        return {
          allowed: false,
          message: '❌ У вас нет прав администратора',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error in isAdmin:', error);
      return {
        allowed: false,
        message: '❌ Произошла ошибка при проверке прав доступа',
      };
    }
  }

  /**
   * Проверяет, является ли пользователь работником
   */
  async isWorker(telegramUserId: number): Promise<AccessCheckResult> {
    try {
      const user = await this.userService.findByTelegramId(telegramUserId);
      if (!user) {
        return { allowed: false, message: '❌ Пользователь не найден' };
      }

      if (!user.Role.some((role) => role.id === '0')) {
        return {
          allowed: false,
          message: '❌ У вас нет прав работника',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error in isWorker:', error);
      return {
        allowed: false,
        message: '❌ Произошла ошибка при проверке прав доступа',
      };
    }
  }

  /**
   * Проверяет, может ли пользователь отменить заявку как администратор
   */
  async canCancelRequestAsAdmin(
    requestId: string,
    telegramUserId: number,
  ): Promise<AccessCheckResult> {
    const adminCheck = await this.isAdmin(telegramUserId);
    if (!adminCheck.allowed) {
      return adminCheck;
    }

    const request = await this.requestService.findById(requestId);
    if (!request) {
      return { allowed: false, message: '❌ Заявка не найдена' };
    }

    return { allowed: true };
  }

  /**
   * Проверяет права доступа и возвращает детальную информацию о заявке
   */
  async getRequestWithAccessCheck(
    requestId: string,
    telegramUserId: number,
  ): Promise<{
    request: FullRequestType | null;
    access: AccessCheckResult;
  }> {
    try {
      const request = await this.requestService.findById(requestId);
      if (!request) {
        return {
          request: null,
          access: { allowed: false, message: '❌ Заявка не найдена' },
        };
      }

      const user = await this.userService.findByTelegramId(telegramUserId);
      if (!user) {
        return {
          request: request as FullRequestType,
          access: { allowed: false, message: '❌ Пользователь не найден' },
        };
      }

      // Администраторы имеют доступ ко всем заявкам
      if (user.Role.some((role) => role.id === '1')) {
        return {
          request: request as FullRequestType,
          access: { allowed: true },
        };
      }

      // Работники имеют доступ только к своим активным заявкам
      if (user.Role.some((role) => role.id === '0')) {
        if (
          request.activeUser &&
          Number(request.activeUser.telegramId) === telegramUserId
        ) {
          return {
            request: request as FullRequestType,
            access: { allowed: true },
          };
        } else {
          return {
            request: request as FullRequestType,
            access: {
              allowed: false,
              message: '❌ У вас нет доступа к этой заявке',
            },
          };
        }
      }

      return {
        request: request as FullRequestType,
        access: {
          allowed: false,
          message: '❌ У вас нет прав для просмотра заявок',
        },
      };
    } catch (error) {
      console.error('Error in getRequestWithAccessCheck:', error);
      return {
        request: null,
        access: {
          allowed: false,
          message: '❌ Произошла ошибка при получении заявки',
        },
      };
    }
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationPriority, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationRenderer } from './notification-renderer';
import { NOTIFICATIONS_QUEUE } from './notifications.queue';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let sellerFindUnique: jest.Mock;
  let notificationCreate: jest.Mock;
  let notificationUpdateMany: jest.Mock;
  let notificationFindMany: jest.Mock;
  let notificationCount: jest.Mock;
  let queueAdd: jest.Mock;
  let render: jest.Mock;

  const activeSeller = { isActive: true, contentLanguage: 'ES' };

  beforeEach(async () => {
    sellerFindUnique = jest.fn().mockResolvedValue(activeSeller);
    notificationCreate = jest.fn().mockResolvedValue({ id: 42 });
    notificationUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    notificationFindMany = jest.fn().mockResolvedValue([]);
    notificationCount = jest.fn().mockResolvedValue(0);
    queueAdd = jest.fn().mockResolvedValue(undefined);
    render = jest
      .fn()
      .mockResolvedValue({ title: 'Título', message: 'Mensaje' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            seller: { findUnique: sellerFindUnique },
            notification: {
              create: notificationCreate,
              updateMany: notificationUpdateMany,
              findMany: notificationFindMany,
              count: notificationCount,
            },
          },
        },
        { provide: NotificationRenderer, useValue: { render } },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE),
          useValue: { add: queueAdd },
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('emit', () => {
    it('writes the in-app row and queues delivery', async () => {
      const id = await service.emit({
        sellerId: 'seller-1',
        type: NotificationType.ORDER_RECEIVED,
        relatedId: '1042',
        actionUrl: '/account/orders/1042',
        data: { reference: '#1042' },
      });

      expect(id).toBe(42);
      expect(notificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId: 'seller-1',
            type: NotificationType.ORDER_RECEIVED,
            title: 'Título',
            message: 'Mensaje',
            relatedId: '1042',
            actionUrl: '/account/orders/1042',
            metadata: { reference: '#1042' },
          }),
        }),
      );
      expect(queueAdd).toHaveBeenCalledTimes(1);
    });

    it('writes the in-app row regardless of any preference', async () => {
      // No preferences are read at all during emit — the gate lives in the
      // delivery worker, so the feed is never suppressed.
      await service.emit({
        sellerId: 'seller-1',
        type: NotificationType.ORDER_RECEIVED,
      });

      expect(notificationCreate).toHaveBeenCalled();
      expect(sellerFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { isActive: true, contentLanguage: true },
        }),
      );
    });

    it('takes the priority from the registry', async () => {
      await service.emit({
        sellerId: 'seller-1',
        type: NotificationType.SALE_PROPOSAL,
      });

      expect(notificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: NotificationPriority.HIGH,
          }),
        }),
      );
    });

    it('skips a deactivated account', async () => {
      sellerFindUnique.mockResolvedValue({
        isActive: false,
        contentLanguage: 'ES',
      });

      await expect(
        service.emit({
          sellerId: 'seller-1',
          type: NotificationType.ORDER_RECEIVED,
        }),
      ).resolves.toBeNull();
      expect(notificationCreate).not.toHaveBeenCalled();
    });

    it('skips an unknown seller', async () => {
      sellerFindUnique.mockResolvedValue(null);

      await expect(
        service.emit({
          sellerId: 'ghost',
          type: NotificationType.ORDER_RECEIVED,
        }),
      ).resolves.toBeNull();
    });

    it('returns null for an empty seller id without touching the database', async () => {
      await expect(
        service.emit({ sellerId: '', type: NotificationType.ORDER_RECEIVED }),
      ).resolves.toBeNull();
      expect(sellerFindUnique).not.toHaveBeenCalled();
    });

    it('still records the notification when the queue is down', async () => {
      queueAdd.mockRejectedValue(new Error('redis unreachable'));

      // Degrades to in-app only rather than losing the notification.
      await expect(
        service.emit({
          sellerId: 'seller-1',
          type: NotificationType.ORDER_RECEIVED,
        }),
      ).resolves.toBe(42);
      expect(notificationCreate).toHaveBeenCalled();
    });

    it('never throws when the write itself fails', async () => {
      notificationCreate.mockRejectedValue(new Error('db down'));

      await expect(
        service.emit({
          sellerId: 'seller-1',
          type: NotificationType.ORDER_RECEIVED,
        }),
      ).resolves.toBeNull();
    });

    it('resolves actorSellerId into a display name before storing', async () => {
      sellerFindUnique
        .mockResolvedValueOnce(activeSeller)
        .mockResolvedValueOnce({
          personProfile: { displayName: 'Camila R.', firstName: 'Camila' },
          businessProfile: null,
        });

      await service.emit({
        sellerId: 'owner-1',
        type: NotificationType.SALE_PROPOSAL,
        data: { actorSellerId: 'offerer-1', requestedProductTitle: 'Bici' },
      });

      expect(render).toHaveBeenCalledWith(
        NotificationType.SALE_PROPOSAL,
        'es',
        expect.objectContaining({ actorName: 'Camila R.' }),
      );
      expect(notificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ actorName: 'Camila R.' }),
          }),
        }),
      );
    });

    it('falls back to a generic actor name when the actor is gone', async () => {
      sellerFindUnique
        .mockResolvedValueOnce(activeSeller)
        .mockResolvedValueOnce(null);

      await service.emit({
        sellerId: 'owner-1',
        type: NotificationType.SALE_PROPOSAL,
        data: { actorSellerId: 'deleted' },
      });

      expect(render).toHaveBeenCalledWith(
        NotificationType.SALE_PROPOSAL,
        'es',
        expect.objectContaining({ actorName: 'Un usuario de Ekoru' }),
      );
    });

    it('maps the seller language onto a locale we have copy for', async () => {
      sellerFindUnique.mockResolvedValue({
        isActive: true,
        contentLanguage: 'FR',
      });
      await service.emit({
        sellerId: 'seller-1',
        type: NotificationType.ORDER_RECEIVED,
      });
      expect(render).toHaveBeenCalledWith(expect.anything(), 'fr', {});
    });

    it('falls back to Spanish for a language we have no copy for', async () => {
      sellerFindUnique.mockResolvedValue({
        isActive: true,
        contentLanguage: 'DE',
      });
      await service.emit({
        sellerId: 'seller-1',
        type: NotificationType.ORDER_RECEIVED,
      });
      expect(render).toHaveBeenCalledWith(expect.anything(), 'es', {});
    });
  });

  describe('feed', () => {
    it('scopes markRead to the caller so a guessed id is a no-op', async () => {
      await service.markRead('seller-1', 99);

      expect(notificationUpdateMany).toHaveBeenCalledWith({
        where: { id: 99, sellerId: 'seller-1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('reports false when markRead matched nothing', async () => {
      notificationUpdateMany.mockResolvedValue({ count: 0 });
      await expect(service.markRead('seller-1', 99)).resolves.toBe(false);
    });

    it('filters to unread when asked', async () => {
      await service.myNotifications({
        sellerId: 'seller-1',
        page: 1,
        pageSize: 20,
        onlyUnread: true,
      });

      expect(notificationFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: 'seller-1', isRead: false },
        }),
      );
    });

    it('counts only unread for the badge', async () => {
      notificationCount.mockResolvedValue(7);
      await expect(service.unreadCount('seller-1')).resolves.toBe(7);
      expect(notificationCount).toHaveBeenCalledWith({
        where: { sellerId: 'seller-1', isRead: false },
      });
    });
  });
});

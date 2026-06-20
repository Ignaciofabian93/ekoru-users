import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../common/exceptions';
import { Language, TransactionKind } from '../graphql/enums';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AccountService', () => {
  let service: AccountService;
  let prisma: any;

  const mockSeller = {
    id: 'seller-123',
    email: 'test@example.com',
    password: 'hashed-password',
    isActive: true,
    points: 100,
    sellerLevelId: 1,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      seller: {
        update: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      sellerLabel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      sellerLabelTranslation: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      sellerAchievedLabel: {
        count: jest.fn().mockResolvedValue(0),
      },
      sellerLevel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      sellerLevelTranslation: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deactivateAccount', () => {
    it('should deactivate seller account successfully', async () => {
      const updatedSeller = { ...mockSeller, isActive: false };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.deactivateAccount({
        sellerId: 'seller-123',
        language: Language.ES,
      });

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        data: { isActive: false },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.deactivateAccount({ sellerId: '', language: Language.ES }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deactivateAccount({
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('reactivateAccount', () => {
    it('should reactivate seller account successfully', async () => {
      const updatedSeller = { ...mockSeller, isActive: true };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.reactivateAccount({
        sellerId: 'seller-123',
        language: Language.ES,
      });

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        data: { isActive: true },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.reactivateAccount({ sellerId: '', language: Language.ES }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.reactivateAccount({
          sellerId: 'seller-123',
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('addPoints', () => {
    it('should add points to seller successfully', async () => {
      const updatedSeller = { ...mockSeller, points: 150 };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.addPoints({
        adminId: 'admin-1',
        targetId: 'target-123',
        points: 50,
        language: Language.ES,
      });

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'target-123' },
        data: { points: { increment: 50 } },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.addPoints({
          adminId: '',
          targetId: 'target-123',
          points: 50,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.addPoints({
          adminId: 'admin-1',
          targetId: 'target-123',
          points: 50,
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('deductPoints', () => {
    it('should deduct points from seller successfully', async () => {
      const updatedSeller = { ...mockSeller, points: 50 };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.deductPoints({
        adminId: 'admin-1',
        targetId: 'target-123',
        points: 50,
        language: Language.ES,
      });

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'target-123' },
        data: { points: { decrement: 50 } },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.deductPoints({
          adminId: '',
          targetId: 'target-123',
          points: 50,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deductPoints({
          adminId: 'admin-1',
          targetId: 'target-123',
          points: 50,
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('updateSellerCategory', () => {
    it('should update seller category successfully', async () => {
      const updatedSeller = { ...mockSeller, sellerLevelId: 2 };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.updateSellerCategory({
        adminId: 'admin-1',
        targetId: 'target-123',
        categoryId: 2,
        language: Language.ES,
      });

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'target-123' },
        data: { sellerLevelId: 2 },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.updateSellerCategory({
          adminId: '',
          targetId: 'target-123',
          categoryId: 2,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateSellerCategory({
          adminId: 'admin-1',
          targetId: 'target-123',
          categoryId: 2,
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('updatePassword', () => {
    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
    });

    it('should update password successfully', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller as any);
      prisma.seller.update.mockResolvedValue(mockSeller as any);

      const result = await service.updatePassword({
        sellerId: 'seller-123',
        currentPassword: 'currentPassword',
        newPassword: 'newPassword',
        language: Language.ES,
      });

      expect(result).toEqual(mockSeller);
      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'currentPassword',
        'hashed-password',
      );
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 'salt');
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        data: { password: 'new-hashed-password' },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.updatePassword({
          sellerId: '',
          currentPassword: 'currentPassword',
          newPassword: 'newPassword',
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when seller is not found', async () => {
      prisma.seller.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword({
          sellerId: 'seller-123',
          currentPassword: 'currentPassword',
          newPassword: 'newPassword',
          language: Language.ES,
        }),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when current password is incorrect', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.updatePassword({
          sellerId: 'seller-123',
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword',
          language: Language.ES,
        }),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updatePassword({
          sellerId: 'seller-123',
          currentPassword: 'currentPassword',
          newPassword: 'newPassword',
          language: Language.ES,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('requestPasswordReset', () => {
    it('should return true', () => {
      const result = service.requestPasswordReset('test@example.com');

      expect(result).toBe(true);
    });
  });

  // ─── Seller Labels ──────────────────────────────────────────────────────────

  const adminId = 'admin-1';
  const mockLabel = {
    id: 1,
    labelName: 'Eco Hero',
    transactionKind: TransactionKind.RECYCLE,
    transactionsRequired: 10,
    description: null,
    badgeIcon: null,
    translations: [],
  };

  describe('createSellerLabel', () => {
    const input = {
      labelName: 'Eco Hero',
      transactionKind: TransactionKind.RECYCLE,
      transactionsRequired: 10,
    };

    it('creates a label when name is free', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue(null);
      prisma.sellerLabel.create.mockResolvedValue(mockLabel);

      const result = await service.createSellerLabel({
        adminId,
        input,
        language: Language.ES,
      });

      expect(result).toEqual(mockLabel);
      expect(prisma.sellerLabel.create).toHaveBeenCalled();
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.createSellerLabel({
          adminId: '',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.sellerLabel.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when label name already exists', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue({ id: 9 });

      await expect(
        service.createSellerLabel({ adminId, input, language: Language.ES }),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.sellerLabel.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSellerLabel', () => {
    it('throws NotFoundError when label does not exist', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSellerLabel({
          adminId,
          id: 99,
          input: { badgeIcon: 'x' },
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.sellerLabel.update).not.toHaveBeenCalled();
    });

    it('updates an existing label', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue(mockLabel);
      prisma.sellerLabel.update.mockResolvedValue({
        ...mockLabel,
        transactionsRequired: 20,
      });

      const result = await service.updateSellerLabel({
        adminId,
        id: 1,
        input: { transactionsRequired: 20 },
        language: Language.ES,
      });

      expect(result.transactionsRequired).toBe(20);
    });
  });

  describe('deleteSellerLabel', () => {
    it('deletes a label that no seller has earned', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue(mockLabel);
      prisma.sellerAchievedLabel.count.mockResolvedValue(0);
      prisma.sellerLabel.delete.mockResolvedValue(mockLabel);

      const result = await service.deleteSellerLabel({
        adminId,
        id: 1,
        language: Language.ES,
      });

      expect(result).toEqual(mockLabel);
      expect(prisma.sellerLabel.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('throws ConflictError when the label has been earned by sellers', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue(mockLabel);
      prisma.sellerAchievedLabel.count.mockResolvedValue(3);

      await expect(
        service.deleteSellerLabel({ adminId, id: 1, language: Language.ES }),
      ).rejects.toThrow(ConflictError);
      expect(prisma.sellerLabel.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when the label does not exist', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteSellerLabel({ adminId, id: 99, language: Language.ES }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('upsertSellerLabelTranslation', () => {
    const input = {
      sellerLabelId: 1,
      language: Language.EN,
      labelName: 'Eco Hero',
      description: 'Recycle champion',
    };

    it('upserts the translation by composite key', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue({ id: 1 });
      prisma.sellerLabelTranslation.upsert.mockResolvedValue({
        id: 5,
        ...input,
      });

      const result = await service.upsertSellerLabelTranslation({
        adminId,
        input,
        language: Language.ES,
      });

      expect(result).toEqual({ id: 5, ...input });
      expect(prisma.sellerLabelTranslation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sellerLabelId_language: {
              sellerLabelId: 1,
              language: Language.EN,
            },
          },
        }),
      );
    });

    it('throws NotFoundError when the label does not exist', async () => {
      prisma.sellerLabel.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertSellerLabelTranslation({
          adminId,
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.sellerLabelTranslation.upsert).not.toHaveBeenCalled();
    });
  });

  describe('deleteSellerLabelTranslation', () => {
    it('deletes an existing translation', async () => {
      const translation = { id: 5, sellerLabelId: 1, language: Language.EN };
      prisma.sellerLabelTranslation.findUnique.mockResolvedValue(translation);
      prisma.sellerLabelTranslation.delete.mockResolvedValue(translation);

      const result = await service.deleteSellerLabelTranslation({
        adminId,
        sellerLabelId: 1,
        translationLanguage: Language.EN,
        language: Language.ES,
      });

      expect(result).toEqual(translation);
    });

    it('throws NotFoundError when the translation does not exist', async () => {
      prisma.sellerLabelTranslation.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteSellerLabelTranslation({
          adminId,
          sellerLabelId: 1,
          translationLanguage: Language.EN,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(prisma.sellerLabelTranslation.delete).not.toHaveBeenCalled();
    });
  });

  // ─── Seller Levels ──────────────────────────────────────────────────────────

  const mockLevel = {
    id: 1,
    levelName: 'Bronze',
    minPoints: 0,
    maxPoints: 99,
    benefits: null,
    badgeIcon: null,
    translations: [],
  };

  describe('createSellerLevel', () => {
    const input = { levelName: 'Bronze', minPoints: 0 };

    it('creates a level when name and points are free', async () => {
      prisma.sellerLevel.findUnique.mockResolvedValue(null);
      prisma.sellerLevel.create.mockResolvedValue(mockLevel);

      const result = await service.createSellerLevel({
        adminId,
        input,
        language: Language.ES,
      });

      expect(result).toEqual(mockLevel);
    });

    it('throws BadRequestError when the level name already exists', async () => {
      prisma.sellerLevel.findUnique.mockResolvedValueOnce({ id: 7 });

      await expect(
        service.createSellerLevel({ adminId, input, language: Language.ES }),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.sellerLevel.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when minPoints already exists', async () => {
      prisma.sellerLevel.findUnique
        .mockResolvedValueOnce(null) // name free
        .mockResolvedValueOnce({ id: 7 }); // points taken

      await expect(
        service.createSellerLevel({ adminId, input, language: Language.ES }),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.sellerLevel.create).not.toHaveBeenCalled();
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.createSellerLevel({
          adminId: '',
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(UnAuthorizedError);
    });
  });

  describe('deleteSellerLevel', () => {
    it('deletes a level not assigned to any seller', async () => {
      prisma.sellerLevel.findUnique.mockResolvedValue(mockLevel);
      prisma.seller.count.mockResolvedValue(0);
      prisma.sellerLevel.delete.mockResolvedValue(mockLevel);

      const result = await service.deleteSellerLevel({
        adminId,
        id: 1,
        language: Language.ES,
      });

      expect(result).toEqual(mockLevel);
      expect(prisma.sellerLevel.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('throws ConflictError when the level is assigned to sellers', async () => {
      prisma.sellerLevel.findUnique.mockResolvedValue(mockLevel);
      prisma.seller.count.mockResolvedValue(5);

      await expect(
        service.deleteSellerLevel({ adminId, id: 1, language: Language.ES }),
      ).rejects.toThrow(ConflictError);
      expect(prisma.sellerLevel.delete).not.toHaveBeenCalled();
    });
  });

  describe('upsertSellerLevelTranslation', () => {
    const input = {
      sellerLevelId: 1,
      language: Language.EN,
      levelName: 'Bronze',
    };

    it('upserts the translation by composite key', async () => {
      prisma.sellerLevel.findUnique.mockResolvedValue({ id: 1 });
      prisma.sellerLevelTranslation.upsert.mockResolvedValue({
        id: 8,
        ...input,
      });

      const result = await service.upsertSellerLevelTranslation({
        adminId,
        input,
        language: Language.ES,
      });

      expect(result).toEqual({ id: 8, ...input });
      expect(prisma.sellerLevelTranslation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sellerLevelId_language: {
              sellerLevelId: 1,
              language: Language.EN,
            },
          },
        }),
      );
    });

    it('throws NotFoundError when the level does not exist', async () => {
      prisma.sellerLevel.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertSellerLevelTranslation({
          adminId,
          input,
          language: Language.ES,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});

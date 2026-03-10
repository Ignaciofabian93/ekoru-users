import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import { Language } from '../graphql/enums';
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

      const result = await service.deactivateAccount('seller-123', Language.ES);

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        data: { isActive: false },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.deactivateAccount('', Language.ES)).rejects.toThrow(
        UnAuthorizedError,
      );
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deactivateAccount('seller-123', Language.ES),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('reactivateAccount', () => {
    it('should reactivate seller account successfully', async () => {
      const updatedSeller = { ...mockSeller, isActive: true };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.reactivateAccount('seller-123', Language.ES);

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-123' },
        data: { isActive: true },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(service.reactivateAccount('', Language.ES)).rejects.toThrow(
        UnAuthorizedError,
      );
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.reactivateAccount('seller-123', Language.ES),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('addPoints', () => {
    it('should add points to seller successfully', async () => {
      const updatedSeller = { ...mockSeller, points: 150 };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.addPoints(
        'seller-123',
        'target-123',
        50,
        Language.ES,
      );

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'target-123' },
        data: { points: { increment: 50 } },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.addPoints('', 'target-123', 50, Language.ES),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.addPoints('seller-123', 'target-123', 50, Language.ES),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('deductPoints', () => {
    it('should deduct points from seller successfully', async () => {
      const updatedSeller = { ...mockSeller, points: 50 };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.deductPoints(
        'seller-123',
        'target-123',
        50,
        Language.ES,
      );

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'target-123' },
        data: { points: { decrement: 50 } },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.deductPoints('', 'target-123', 50, Language.ES),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deductPoints('seller-123', 'target-123', 50, Language.ES),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('updateSellerCategory', () => {
    it('should update seller category successfully', async () => {
      const updatedSeller = { ...mockSeller, sellerLevelId: 2 };
      prisma.seller.update.mockResolvedValue(updatedSeller as any);

      const result = await service.updateSellerCategory(
        'seller-123',
        'target-123',
        2,
        Language.ES,
      );

      expect(result).toEqual(updatedSeller);
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 'target-123' },
        data: { sellerLevelId: 2 },
      });
    });

    it('should throw UnAuthorizedError when sellerId is not provided', async () => {
      await expect(
        service.updateSellerCategory('', 'target-123', 2, Language.ES),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateSellerCategory(
          'seller-123',
          'target-123',
          2,
          Language.ES,
        ),
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

      const result = await service.updatePassword(
        'seller-123',
        'currentPassword',
        'newPassword',
        Language.ES,
      );

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
        service.updatePassword(
          '',
          'currentPassword',
          'newPassword',
          Language.ES,
        ),
      ).rejects.toThrow(UnAuthorizedError);
      expect(prisma.seller.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when seller is not found', async () => {
      prisma.seller.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword(
          'seller-123',
          'currentPassword',
          'newPassword',
          Language.ES,
        ),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when current password is incorrect', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.updatePassword(
          'seller-123',
          'wrongPassword',
          'newPassword',
          Language.ES,
        ),
      ).rejects.toThrow(BadRequestError);
      expect(prisma.seller.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError on database error', async () => {
      prisma.seller.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updatePassword(
          'seller-123',
          'currentPassword',
          'newPassword',
          Language.ES,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('requestPasswordReset', () => {
    it('should return true', () => {
      const result = service.requestPasswordReset('test@example.com');

      expect(result).toBe(true);
    });
  });
});

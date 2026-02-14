import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('Finance Tracker API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Clean up test data before running tests
    await prisma.savingsGoal.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data after running tests
    await prisma.savingsGoal.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('Authentication', () => {
    describe('POST /auth/register', () => {
      it('should register a new user and return access token', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
          .expect(201);

        expect(response.body).toHaveProperty('accessToken');
        expect(typeof response.body.accessToken).toBe('string');

        // Verify user was created in database
        const user = await prisma.user.findUnique({
          where: { email: 'test@example.com' },
        });
        expect(user).toBeDefined();
        expect(user?.email).toBe('test@example.com');
        testUserId = user!.id;
      });

      it('should reject registration with existing email', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password: 'anotherpassword',
          })
          .expect(409);
      });
    });

    describe('POST /auth/login', () => {
      it('should login with correct credentials', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
          .expect(200);

        expect(response.body).toHaveProperty('accessToken');
        authToken = response.body.accessToken;
      });

      it('should reject login with wrong password', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
          .expect(401);
      });

      it('should reject login with non-existent email', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'password123',
          })
          .expect(401);
      });
    });
  });

  describe('Transactions', () => {
    let transactionId: string;

    describe('POST /transactions', () => {
      it('should create a new transaction when authenticated', async () => {
        const response = await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Groceries',
            amount: 50.0,
            date: '2025-01-15T00:00:00.000Z',
            category: 'Food',
            type: 'EXPENSE',
          })
          .expect(201);

        expect(response.body.title).toBe('Groceries');
        expect(response.body.amount).toBe(50);
        expect(response.body.category).toBe('Food');
        expect(response.body.type).toBe('EXPENSE');
        transactionId = response.body.id;
      });

      it('should create an income transaction', async () => {
        const response = await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Salary',
            amount: 3000.0,
            date: '2025-01-01T00:00:00.000Z',
            category: 'Work',
            type: 'INCOME',
          })
          .expect(201);

        expect(response.body.type).toBe('INCOME');
      });

      it('should reject unauthenticated requests', async () => {
        await request(app.getHttpServer())
          .post('/transactions')
          .send({
            title: 'Test',
            amount: 100,
            date: '2025-01-15T00:00:00.000Z',
            category: 'Test',
            type: 'EXPENSE',
          })
          .expect(401);
      });

      it('should reject invalid transaction type', async () => {
        await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test',
            amount: 100,
            date: '2025-01-15T00:00:00.000Z',
            category: 'Test',
            type: 'INVALID_TYPE',
          })
          .expect(400);
      });
    });

    describe('GET /transactions', () => {
      it('should return all transactions for authenticated user', async () => {
        const response = await request(app.getHttpServer())
          .get('/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
      });

      it('should reject unauthenticated requests', async () => {
        await request(app.getHttpServer())
          .get('/transactions')
          .expect(401);
      });
    });

    describe('PATCH /transactions/:id', () => {
      it('should update a transaction', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Updated Groceries',
            amount: 75.0,
          })
          .expect(200);

        expect(response.body.title).toBe('Updated Groceries');
        expect(response.body.amount).toBe(75);
      });

      it('should reject update of non-existent transaction', async () => {
        await request(app.getHttpServer())
          .patch('/transactions/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Test' })
          .expect(403);
      });
    });

    describe('DELETE /transactions/:id', () => {
      it('should delete a transaction', async () => {
        await request(app.getHttpServer())
          .delete(`/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);
      });

      it('should reject delete of non-existent transaction', async () => {
        await request(app.getHttpServer())
          .delete('/transactions/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);
      });
    });
  });

  describe('Analytics', () => {
    it('should return analytics for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('monthlyIncome');
      expect(response.body).toHaveProperty('monthlyExpenses');
      expect(response.body).toHaveProperty('currentBudget');
      expect(response.body).toHaveProperty('savingsGoal');
      expect(response.body).toHaveProperty('savedAmount');
      expect(response.body).toHaveProperty('hasReachedGoal');
    });

    it('should return historical analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/historical')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return monthly summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/monthly-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return category expenses', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/category-expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('labels');
      expect(response.body).toHaveProperty('datasets');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/analytics')
        .expect(401);
    });
  });

  describe('Users', () => {
    it('should return current user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe('test@example.com');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should set savings goal', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/savings-goal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 500.0 })
        .expect(201);

      expect(response.body.amount).toBe(500);
    });

    it('should reject invalid savings goal', async () => {
      await request(app.getHttpServer())
        .post('/users/savings-goal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -100 })
        .expect(400);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });
  });
});
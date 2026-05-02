/**
 * __tests__/unit/errorHandler.test.ts
 * TDD spec for the centralised Express error handler.
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../middleware/errorHandler';

function mockReqRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const req = {} as Request;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('errorHandler middleware', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  describe('given a plain Error with no status property', () => {
    it('should respond with HTTP 500', () => {
      const { req, res, next } = mockReqRes();
      errorHandler(new Error('something broke'), req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should respond with JSON body { error: message }', () => {
      const { req, res, next } = mockReqRes();
      errorHandler(new Error('something broke'), req, res, next);
      expect(res.json).toHaveBeenCalledWith({ error: 'something broke' });
    });
  });

  describe('given an Error with a custom status property', () => {
    it('when status=404, should respond with HTTP 404', () => {
      const { req, res, next } = mockReqRes();
      const err = Object.assign(new Error('not found'), { status: 404 });
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('when status=422, should respond with HTTP 422', () => {
      const { req, res, next } = mockReqRes();
      const err = Object.assign(new Error('invalid'), { status: 422 });
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
    });
  });

  describe('given NODE_ENV is production', () => {
    it('should NOT call console.error', () => {
      process.env.NODE_ENV = 'production';
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const { req, res, next } = mockReqRes();
      errorHandler(new Error('oops'), req, res, next);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('given NODE_ENV is not production', () => {
    it('should call console.error with the error', () => {
      process.env.NODE_ENV = 'test';
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const { req, res, next } = mockReqRes();
      const err = new Error('logged error');
      errorHandler(err, req, res, next);
      expect(spy).toHaveBeenCalledWith(expect.anything(), err);
    });
  });
});

import { NextFunction, Request, Response } from 'express';
import { ValidationChain, validationResult } from 'express-validator';
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema';
import HTTP_STATUS from '~/constants/httpStatus';
import { EntityError, ErrorWithStatus } from '~/models/Errors';

export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req);
    const error = validationResult(req)

    // Không có lỗi validation → cho request đi tiếp
    if (error.isEmpty()) {
      return next()
    }
    const errorObject = error.mapped()

    const entityError = new EntityError({ errors: {} })
    for (const key in errorObject) {
      const { msg } = errorObject[key];
      //Trả về lỗi k phải là lỗi validation 
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg);
      }
      entityError.errors[key] = errorObject[key]
    };
    next(entityError)
  };
}
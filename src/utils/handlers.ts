import { Request, Response, NextFunction, RequestHandler } from 'express';

export const wrapRequestHandler = <P>(fn: RequestHandler<P>) => {
  return async (req: Request<P>, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
P = Generic Type đại diện cho kiểu của req.params

Ví dụ:
getProfileController:
Request<GetProfileReqParams>

=> P = GetProfileReqParams

Nhờ Generic, wrapRequestHandler có thể dùng cho nhiều controller
có params khác nhau mà vẫn giữ được type.

Ví dụ:
wrapRequestHandler(getProfileController)
=> P = GetProfileReqParams

Nếu controller khác:
Request<OtherParams>
=> P = OtherParams

RequestHandler<P>
=> function handler nhận Request<P>

filter / wrap không tự biết P là gì.
TypeScript sẽ suy ra P dựa vào function fn được truyền vào.
 */
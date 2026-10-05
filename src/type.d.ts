import { TokenPayload } from './models/requests/User.requests';
import User from './models/schemas/User.schema';
declare module 'express' {
  interface Request {
    user?: User;
    decodedAuthorization?: TokenPayload;
    decodedRefreshToken?: TokenPayload;
    decodedEmailVerifyToken?: TokenPayload;
    decodedForgotPasswordToken?: TokenPayload;
  }
}
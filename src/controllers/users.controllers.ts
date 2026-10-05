import { Request, Response } from 'express';
import { ChangePasswordReqBody, EmailVerifyReqBody, FollowReqBody, ForgotPasswordReqBody, GetProfileReqParams, LoginReqBody, LogoutReqBody, RegisterReqBody, ResetPasswordReqBody, TokenPayload, UnfollowReqParams, UpdateMeReqBody, VerifyForgotPasswordTokenReqBody } from '~/models/requests/User.requests';
import { NextFunction, ParamsDictionary } from "express-serve-static-core"
import usersServices from '~/services/users.services';
import { ObjectId } from 'mongodb';
import User from '~/models/schemas/User.schema';
import { USERS_MESSAGES } from '~/constants/messages';
import databaseService from '~/services/database.services';
import HTTP_STATUS from '~/constants/httpStatus';
import { UserVerifyStatus } from '~/constants/enums';
import { pick } from 'lodash';

export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const user = req.user as User;
  const userId = user._id as ObjectId;
  const result = await usersServices.login({ userId: userId.toString(), verify: user.verify });
  return res.json(
    {
      message: USERS_MESSAGES.LOGIN_SUCCESS,
      result
    });
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response, _next: NextFunction) => {
  const result = await usersServices.register(req.body);
  return res.json(
    {
      message: USERS_MESSAGES.REGISTER_SUCCESS,
      result
    });
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  const { refreshToken } = req.body;
  const result = await usersServices.logout(refreshToken);
  return res.json(result);
}

export const verifyEmailController = async (req: Request<ParamsDictionary, any, EmailVerifyReqBody>, res: Response, next: NextFunction) => {
  const { userId } = req.decodedEmailVerifyToken as TokenPayload;
  const user = await databaseService.users.findOne({
    _id: new ObjectId(userId)
  });
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND
    });
  }
  if (user.email_verify_token === '') {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    });
  }
  const result = await usersServices.verifyEmail(userId);
  return res.json({
    message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS,
    result
  });
}


export const resendVerifyEmailController = async (req: Request<ParamsDictionary, any, EmailVerifyReqBody>, res: Response, next: NextFunction) => {
  const { userId } = req.decodedAuthorization as TokenPayload;
  const user = await databaseService.users.findOne({
    _id: new ObjectId(userId)
  });
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND
    });
  }
  if (user.verify === UserVerifyStatus.Verified) {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    });
  }
  const result = await usersServices.resendVerifyEmail(userId);
  return res.json(
    result
  );

}

export const forgotPasswordController = async (req: Request<ParamsDictionary, any, ForgotPasswordReqBody>, res: Response, next: NextFunction) => {
  const { _id, verify } = req.user as User;
  const userId = _id as ObjectId;
  const result = await usersServices.forgotPassword({ userId: userId.toString(), verify });
  return res.json(result);
}


export const verifyForgotPasswordTokenController = async (req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>, res: Response, next: NextFunction) => {
  return res.json({ message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_SUCCESS });
}

export const resetPasswordController = async (req: Request<ParamsDictionary, any, ResetPasswordReqBody>, res: Response, next: NextFunction) => {
  const { userId } = req.decodedForgotPasswordToken as TokenPayload;
  const { password } = req.body;
  const result = await usersServices.resetPassword(userId, password);
  return res.json(result);
}

export const getMeController = async (req: Request, res: Response) => {
  const { userId } = req.decodedAuthorization as TokenPayload;
  const result = await usersServices.getMe(userId);
  return res.json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    result
  });
}

export const updateMeController = async (req: Request<ParamsDictionary, any, UpdateMeReqBody>, res: Response, next: NextFunction) => {
  const { userId } = req.decodedAuthorization as TokenPayload;
  const { body } = req;
  const user = await usersServices.updateMe(userId, body);
  return res.json({
    message: USERS_MESSAGES.UPDATE_ME_SUCCESS,
    result: user
  });
}


export const getProfileController = async (req: Request<GetProfileReqParams>, res: Response, next: NextFunction) => {
  const { username } = req.params;
  const user = await usersServices.getProfile(username);
  return res.json({
    message: USERS_MESSAGES.GET_PROFILE_SUCCESS,
    result: user
  });
}

export const followController = async (req: Request<ParamsDictionary, any, FollowReqBody>, res: Response, next: NextFunction) => {
  const { userId } = req.decodedAuthorization as TokenPayload;
  const { followUserId } = req.body;
  const result = await usersServices.follow(userId, followUserId);
  return res.json(result);
}

export const unfollowController = async (req: Request<UnfollowReqParams>, res: Response, next: NextFunction) => {
  const { userId } = req.decodedAuthorization as TokenPayload;
  const { userId: unfollowUserId } = req.params;
  const result = await usersServices.unfollow(userId, unfollowUserId);
  return res.json(result);
}

export const changePasswordController = async (req: Request<ParamsDictionary, any, ChangePasswordReqBody>, res: Response, next: NextFunction) => {
  const { userId } = req.decodedAuthorization as TokenPayload;
  const { password } = req.body;
  const result = await usersServices.changePassword(userId, password);
  return res.json(result);
}
import User from "~/models/schemas/User.schema";
import databaseService from "./database.services";
import { RegisterReqBody, UpdateMeReqBody } from "~/models/requests/User.requests";
import { signToken } from "~/utils/jwt";
import { TokenType, UserVerifyStatus } from "~/constants/enums";
import type { StringValue } from 'ms';
import { hashPassword } from "~/utils/crypto";
import { ObjectId } from "mongodb";
import RefreshToken from "~/models/schemas/RefreshToken";
import { config } from "dotenv";
import { USERS_MESSAGES } from "~/constants/messages";
import HTTP_STATUS from "~/constants/httpStatus";
import { ErrorWithStatus } from "~/models/Errors";
import Follower from "~/models/schemas/Follower.chema";
config();

class UsersServices {
  private signAccessToken = (
    { userId, verify }: { userId: string, verify: UserVerifyStatus }
  ) => {
    return signToken({
      payload: {
        userId,
        type: TokenType.AccessToken,
        verify
      },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN as StringValue
      }
    });
  }

  private forgotPasswordToken = ({ userId, verify }: { userId: string, verify: UserVerifyStatus }) => {
    return signToken({
      payload: {
        userId,
        type: TokenType.ForgotPasswordToken,
        verify
      },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN as StringValue
      }
    });
  }

  private signRefreshToken = ({ userId, verify }: { userId: string, verify: UserVerifyStatus }) => {
    return signToken({
      payload: {
        userId,
        type: TokenType.RefreshToken,
        verify
      },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN as StringValue
      }
    });
  }

  private signEmailVerifyToken = ({ userId, verify }: { userId: string, verify: UserVerifyStatus }) => {
    return signToken({
      payload: {
        userId,
        type: TokenType.EmailVerificationToken,
        verify
      },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: {
        expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN as StringValue
      }
    });
  }

  private signAccessAndRefreshTokens = async ({ userId, verify }: { userId: string, verify: UserVerifyStatus }) => {
    return Promise.all([
      this.signAccessToken({ userId, verify }),
      this.signRefreshToken({ userId, verify })
    ]);
  }

  async register(payload: RegisterReqBody) {
    const userId = new ObjectId();
    const emailVerifyToken = await this.signEmailVerifyToken({ userId: userId.toString(), verify: UserVerifyStatus.Unverified });
    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: userId,
        username: `user_${userId.toString()}`,
        email_verify_token: emailVerifyToken,
        password: hashPassword(payload.password),
        date_of_birth: new Date(payload.date_of_birth)
      })
    );
    const [accessToken, refreshToken] = await this.signAccessAndRefreshTokens({ userId: userId.toString(), verify: UserVerifyStatus.Unverified });
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(userId),
        token: refreshToken
      })
    );
    console.log("emailVerifyToken: ", emailVerifyToken);
    return {
      accessToken,
      refreshToken
    };
  }

  async checkEmailExist(email: string) {
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async login({ userId, verify }: { userId: string, verify: UserVerifyStatus }) {
    const [accessToken, refreshToken] = await this.signAccessAndRefreshTokens(
      {
        userId,
        verify
      });
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(userId),
        token: refreshToken
      })
    );
    return {
      accessToken,
      refreshToken
    };
  }

  async logout(refreshToken: string) {
    await databaseService.refreshTokens.deleteOne({ token: refreshToken });
    return { message: USERS_MESSAGES.LOGOUT_SUCCESS };
  }

  async verifyEmail(userId: string) {
    const [token] = await Promise.all([
      this.signAccessAndRefreshTokens({ userId, verify: UserVerifyStatus.Verified }),
      await databaseService.users.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            email_verify_token: '',
            updated_at: new Date(),
            verify: UserVerifyStatus.Verified
          }
        }
      )]);
    const [accessToken, refreshToken] = token;
    return { accessToken, refreshToken };
  }

  async resendVerifyEmail(userId: string) {
    console.log("resendVerifyEmail userId: ", userId);
    const emailVerifyToken = await this.signEmailVerifyToken({ userId: userId, verify: UserVerifyStatus.Unverified });

    //Giả xử gửi email
    console.log("Send verification email : ", emailVerifyToken);

    //Cập nhật lại token mới vào database
    await databaseService.users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          email_verify_token: emailVerifyToken,
          updated_at: new Date()
        }
      }
    );
    return { message: USERS_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS };
  }

  async forgotPassword({ userId, verify }: { userId: string, verify: UserVerifyStatus }) {
    const forgotPasswordToken = await this.forgotPasswordToken({ userId, verify });
    await databaseService.users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          forgot_password_token: forgotPasswordToken,
          updated_at: new Date()
        }
      }
    );
    // Gửi email kèm đường link reset password đến người dùng: https://twitter.com/reset-password?token=forgotPasswordToken
    console.log("Send forgot password email : ", forgotPasswordToken);
    return { message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD };
  }

  async resetPassword(userId: string, newPassword: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          password: hashPassword(newPassword),
          forgot_password_token: '',
          updated_at: new Date()
        }
      }
    );
    return { message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS };
  }

  async getMe(userId: string) {
    const user = await databaseService.users.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } });
    if (!user) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return user;
  }

  async updateMe(userId: string, payload: UpdateMeReqBody) {
    const body = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload;
    const user = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $set: {
          ...(body as UpdateMeReqBody & { date_of_birth?: Date }),
        },
        $currentDate: {
          updated_at: true
        }
      },
      { returnDocument: 'after', projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    );
    return user;
  }

  async getProfile(username: string) {
    const user = await databaseService.users.findOne(
      {
        username
      },
      {
        projection: {
          password: 0, email_verify_token: 0, forgot_password_token: 0, created_at: 0, updated_at: 0
        }
      });
    if (!user) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return user;
  }

  async follow(userId: string, followUserId: string) {
    const followerUser = await databaseService.followers.findOne({
      user_id: new ObjectId(userId),
      followed_user_id: new ObjectId(followUserId)
    });

    if (!followerUser) {
      await databaseService.followers.insertOne(
        new Follower({
          user_id: new ObjectId(userId),
          followed_user_id: new ObjectId(followUserId)
        })
      );
      return { message: USERS_MESSAGES.FOLLOW_SUCCESS };
    }
    return { message: USERS_MESSAGES.FOLLOWED }

  }

  async unfollow(userId: string, followUserId: string) {
    const followerUser = await databaseService.followers.findOne({
      user_id: new ObjectId(userId),
      followed_user_id: new ObjectId(followUserId)
    });
    if (!followerUser) {
      return { message: USERS_MESSAGES.ALREADY_UNFOLLOWED }
    }
    await databaseService.followers.deleteOne({
      user_id: new ObjectId(userId),
      followed_user_id: new ObjectId(followUserId)
    })
    return { message: USERS_MESSAGES.UNFOLLOW_SUCCESS };
  }

  async changePassword(userId: string, newPassword: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          password: hashPassword(newPassword),
          updated_at: new Date()
        }
      }
    );
    return { message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS };
  }
}

const usersServices = new UsersServices();
export default usersServices;


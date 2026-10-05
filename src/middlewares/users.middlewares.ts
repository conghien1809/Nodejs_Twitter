import { checkSchema, ParamSchema } from 'express-validator';
import { JsonWebTokenError } from 'jsonwebtoken';
import HTTP_STATUS from '~/constants/httpStatus';
import { USERS_MESSAGES } from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import databaseService from '~/services/database.services';
import usersServices from '~/services/users.services';
import { hashPassword } from '~/utils/crypto';
import { verifyToken } from '~/utils/jwt';
import { validate } from '~/utils/validation';
import { Request, Response, NextFunction } from 'express'
import dotenv from "dotenv";
import { ObjectId } from 'mongodb';
import { UserVerifyStatus } from '~/constants/enums';
import { TokenPayload } from '~/models/requests/User.requests';
import { REGEX_USERNAME } from '~/constants/regex';

dotenv.config();

const forgotPasswordSchema: ParamSchema = {
  in: ['body'],
  trim: true,
  custom: {
    options: async (value: string, { req }) => {
      if (!value) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED,
          status: HTTP_STATUS.UNAUTHORIZED
        });
      }
      try {
        const decodedForgotPasswordToken = await verifyToken({
          token: value,
          secretOrPublicKey:
            process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
        });
        const { userId } = decodedForgotPasswordToken
        const user = await databaseService.users.findOne({ _id: new ObjectId(userId) });
        if (!user) {
          throw new ErrorWithStatus({
            message: USERS_MESSAGES.USER_NOT_FOUND,
            status: HTTP_STATUS.NOT_FOUND
          });
        }
        if (user.forgot_password_token !== value) {
          throw new ErrorWithStatus({
            message: USERS_MESSAGES.INVALID_FORGOT_PASSWORD_TOKEN,
            status: HTTP_STATUS.UNAUTHORIZED
          });
        }
        (req as Request).decodedForgotPasswordToken = decodedForgotPasswordToken;
      } catch (error) {
        if (error instanceof JsonWebTokenError) {
          throw new ErrorWithStatus({
            message: (error as JsonWebTokenError).message,
            status: HTTP_STATUS.UNAUTHORIZED
          });
        }
        throw error;
      }
      return true;
    }
  }
}

const passwordSchema: ParamSchema = {
  in: ['body'],
  isString: {
    errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
  },
  notEmpty: {
    errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
  },
  isLength: {
    options: { min: 6, max: 50 },
    errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50
  },
  isStrongPassword: {
    options: {
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG,
  },
}

const confirmPasswordSchema: ParamSchema = {
  in: ['body'],
  isString: {
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
  },
  notEmpty: {
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
  },
  custom: {
    options: (value, { req }) => value === req.body.password,
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD,
  },
}

const nameSchema: ParamSchema = {
  in: ['body'],
  isString: {
    errorMessage: USERS_MESSAGES.NAME_MUST_BE_A_STRING
  },
  trim: true,
  notEmpty: {
    errorMessage: USERS_MESSAGES.NAME_IS_REQUIRED
  },
  isLength: {
    options: { min: 1, max: 100 },
    errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
  },
}

const imageSchema: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: USERS_MESSAGES.IMAGE_URL_MUST_BE_STRING
  },
  trim: true,
  isLength: {
    options: {
      min: 1,
      max: 400
    },
    errorMessage: USERS_MESSAGES.IMAGE_URL_LENGTH
  }
}

const dateOfBirthSchema: ParamSchema = {
  isISO8601: {
    options: {
      strict: true,
      strictSeparator: true
    },
    errorMessage: USERS_MESSAGES.DATE_OF_BIRTH_MUST_BE_ISO8601
  }
}

const userIdSchema: ParamSchema = {
  custom: {
    options: async (value: string) => {
      if (!ObjectId.isValid(value)) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGES.INVALID_USER_ID,
          status: HTTP_STATUS.NOT_FOUND
        })
      }
      const followUser = await databaseService.users.findOne({
        _id: new ObjectId(value)
      })
      if (!followUser) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGES.USER_NOT_FOUND,
          status: HTTP_STATUS.NOT_FOUND
        })
      }
      return true
    }
  }
}


export const loginValidation = validate(
  checkSchema({
    email: {
      in: ['body'],
      isEmail: {
        errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
      },
      trim: true,
      custom: {
        options: async (value, { req }) => {
          const user = await databaseService.users.findOne({ email: value, password: hashPassword(req.body.password) })

          if (user === null) {
            throw new Error(USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT)
          }
          req.user = user
          return true
        }
      }
    },
    password: passwordSchema
  })
)

export const registerValidation = validate(
  checkSchema({
    name: nameSchema,
    email: {
      in: ['body'],
      isEmail: {
        errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
      },
      trim: true,
      custom: {
        options: async (value) => {
          const isExistEmail = await usersServices.checkEmailExist(value)
          if (isExistEmail) {
            throw new Error(USERS_MESSAGES.EMAIL_ALREADY_EXISTS)
          }
          return true
        }
      }
    },
    password: passwordSchema,
    confirm_password: confirmPasswordSchema,
    date_of_birth: dateOfBirthSchema
  })
)

export const accessTokenValidation = validate(
  checkSchema({
    authorization: {
      in: ['headers'],
      custom: {
        options: async (value: string, { req }) => {
          const accessToken = (value || '').split(' ')[1];
          if (!accessToken) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED,
              status: HTTP_STATUS.UNAUTHORIZED
            });
          }
          try {
            const decodedAuthorization = await verifyToken({ token: accessToken, secretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string });
            (req as Request).decodedAuthorization = decodedAuthorization;
          } catch (error) {
            throw new ErrorWithStatus({
              message: (error as JsonWebTokenError).message,
              status: HTTP_STATUS.UNAUTHORIZED
            });
          }
          return true;
        }
      }
    },
  })
)

export const refreshTokenValidation = validate(
  checkSchema({
    refreshToken: {
      in: ['body'],
      trim: true,
      custom: {
        options: async (value: string, { req }) => {
          if (!value) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.REFRESH_TOKEN_IS_REQUIRED,
              status: HTTP_STATUS.UNAUTHORIZED
            });
          }
          try {
            const [decodedRefreshToken, storedRefreshToken] = await Promise.all([
              verifyToken({ token: value, secretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string }),
              databaseService.refreshTokens.findOne({ token: value })
            ]);
            if (storedRefreshToken === null) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.USED_REFRESH_TOKEN_OR_NOT_EXIST,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            (req as Request).decodedRefreshToken = decodedRefreshToken;
          } catch (error) {
            if (error instanceof JsonWebTokenError) {
              throw new ErrorWithStatus({
                message: (error as JsonWebTokenError).message,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            throw error;
          }
          return true;
        }
      }
    }
  })
)


export const emailVerifyTokenValidation = validate(
  checkSchema({
    emailVerifyToken: {
      in: ['body'],
      trim: true,
      custom: {
        options: async (value: string, { req }) => {
          if (!value) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_REQUIRED,
              status: HTTP_STATUS.UNAUTHORIZED
            });
          }
          try {
            const decodedEmailVerifyToken = await verifyToken({
              token: value,
              secretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
            });
            (req as Request).decodedEmailVerifyToken = decodedEmailVerifyToken;
          } catch (error) {
            throw new ErrorWithStatus({
              message: (error as JsonWebTokenError).message,
              status: HTTP_STATUS.UNAUTHORIZED
            });
          }
          return true;
        }
      }
    }
  })
)

export const forgotPasswordValidation = validate(
  checkSchema({
    email: {
      in: ['body'],
      isEmail: {
        errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
      },
      trim: true,
      custom: {
        options: async (value, { req }) => {
          const user = await databaseService.users.findOne({ email: value })
          if (user === null) {
            throw new Error(USERS_MESSAGES.USER_NOT_FOUND)
          }
          req.user = user
          return true
        }
      }
    }
  })
)


export const verifyForgotPasswordTokenValidation = validate(
  checkSchema({
    forgotPasswordToken: forgotPasswordSchema
  })
)

export const resetPasswordValidation = validate(
  checkSchema({
    forgotPasswordToken: forgotPasswordSchema,
    password: passwordSchema,
    confirm_password: confirmPasswordSchema
  }))


export const verifiedUserValidation = (req: Request, res: Response, next: NextFunction) => {
  const { verify } = req.decodedAuthorization as TokenPayload;
  if (verify !== UserVerifyStatus.Verified) {
    return next(new ErrorWithStatus({
      message: USERS_MESSAGES.USER_NOT_VERIFIED,
      status: HTTP_STATUS.FORBIDDEN
    }));
  }
  next();
};

export const updateMeValidator = validate(
  checkSchema(
    {
      name: {
        ...nameSchema,
        optional: true,
        notEmpty: undefined
      },
      date_of_birth: {
        ...dateOfBirthSchema,
        optional: true
      },
      bio: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.BIO_MUST_BE_STRING
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: USERS_MESSAGES.BIO_LENGTH
        }
      },
      location: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.LOCATION_MUST_BE_STRING
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: USERS_MESSAGES.LOCATION_LENGTH
        }
      },
      website: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.WEBSITE_MUST_BE_STRING
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: USERS_MESSAGES.WEBSITE_LENGTH
        }
      },
      username: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.USERNAME_MUST_BE_STRING
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!REGEX_USERNAME.test(value)) {
              throw new Error(USERS_MESSAGES.USERNAME_INVALID)
            }
            const user = await databaseService.users.findOne({ username: value })
            if (user) {
              throw new Error(USERS_MESSAGES.USERNAME_EXISTED)
            }
          }
        }
      },
      avatar: imageSchema,
      cover_photo: imageSchema
    },
    ['body']
  )
)


export const followValidation = validate(
  checkSchema({
    followUserId: userIdSchema,

  }, ['body'])
)


export const unfollowValidation = validate(
  checkSchema({
    userId: userIdSchema
  }, ['params'])
)

export const changePasswordValidation = validate(
  checkSchema({
    oldPassword: {
      ...passwordSchema,
      custom: {
        options: async (value, { req }) => {
          const { userId } = req.decodedAuthorization as TokenPayload;
          const user = await databaseService.users.findOne({ _id: new ObjectId(userId) });
          if (!user) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.USER_NOT_FOUND,
              status: HTTP_STATUS.NOT_FOUND
            });
          }
          const { password } = user;
          const isMatch = hashPassword(value) === password;
          if (!isMatch) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.OLD_PASSWORD_NOT_MATCH,
              status: HTTP_STATUS.BAD_REQUEST
            });
          }
        }
      },
    },
    password: passwordSchema,
    confirm_password: confirmPasswordSchema
  }, ['body'])
)
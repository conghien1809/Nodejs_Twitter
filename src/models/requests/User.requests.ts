import { JwtPayload } from "jsonwebtoken"
import { TokenType } from "~/constants/enums"
import { ParamsDictionary } from "express-serve-static-core"

export interface RegisterReqBody {
  name: string
  email: string
  password: string
  confirm_password: string,
  date_of_birth: string
}

export interface LoginReqBody {
  email: string
  password: string
}

export interface ResetPasswordReqBody {
  forgot_password_token: string
  password: string
  confirm_new_password: string
}

export interface ForgotPasswordReqBody {
  email: string
}


export interface VerifyForgotPasswordTokenReqBody {
  forgot_password_token: string
}

export interface LogoutReqBody {
  refreshToken: string
}

export interface EmailVerifyReqBody {
  email_verify_token: string
}

export interface FollowReqBody {
  followUserId: string
}

export interface UpdateMeReqBody {
  name?: string
  date_of_birth?: string
  bio?: string
  location?: string
  website?: string,
  cover_photo?: string,
  avatar?: string
  username?: string
}

export interface GetProfileReqParams extends ParamsDictionary {
  username: string
}

export interface UnfollowReqParams extends ParamsDictionary {
  userId: string
}


export interface ChangePasswordReqBody {
  old_password: string
  password: string
  confirm_password: string
}

// Interface for the request body when updating user information.


// Interface for the payload contained in the signed JWT token.
export interface TokenPayload extends JwtPayload {
  userId: string,
  tokenType: TokenType
}
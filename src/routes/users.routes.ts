import { Router } from 'express';
import { changePasswordController, followController, forgotPasswordController, getMeController, getProfileController, loginController, logoutController, registerController, resendVerifyEmailController, resetPasswordController, unfollowController, updateMeController, verifyEmailController, verifyForgotPasswordTokenController } from '../controllers/users.controllers';
import { accessTokenValidation, changePasswordValidation, emailVerifyTokenValidation, followValidation, forgotPasswordValidation, loginValidation, refreshTokenValidation, registerValidation, resetPasswordValidation, unfollowValidation, updateMeValidator, verifiedUserValidation, verifyForgotPasswordTokenValidation } from '../middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';
import { filterMiddleware } from '~/middlewares/common.middleware';
import { UpdateMeReqBody } from '~/models/requests/User.requests';
const usersRouter = Router();


/**
 * Description: Login a user    
 * Path: /login
 * Method: POST
 * Request Body: { email: string, password: string }
 * Response: { message: string, result: { accessToken: string, refreshToken: string } }
 */
usersRouter.post('/login', loginValidation, wrapRequestHandler(loginController));

/**
 * Description: Register a new user
 * Path: /register
 * Method: POST
 * Request Body: { email: string, password: string, dateOfBirth: ISODate, name: string, confirmPassword: string }
 * Response: { message: string, result: { accessToken: string, refreshToken: string } }
 */
usersRouter.post('/register', registerValidation, wrapRequestHandler(registerController));


/**
 * Description: Refresh access token using refresh token  
 * Path: /logout
 * Method: POST
 * Header: Authorization: Bearer <refresh_token>
 * Request Body: { refreshToken: string }
 * Response: { message: string }
 */
usersRouter.post('/logout', accessTokenValidation, refreshTokenValidation, wrapRequestHandler(logoutController));



/**
 * Description: Verify user's email when user clicks on the verification link sent to their email
 * Path: /verify-email
 * Method: POST
 * Request Body: {   email_verify_token: string}
 * Response: { message: string }
 */
usersRouter.post('/verify-email', emailVerifyTokenValidation, wrapRequestHandler(verifyEmailController));



/**
 * Description: Resend email verification link to user's email
 * Path: /resend-email-verify
 * Method: POST
 * Header: Authorization: Bearer <access_token>
 * Request Body: {}
 * Response: { message: string }
 */
usersRouter.post('/resend-email-verify', accessTokenValidation, wrapRequestHandler(resendVerifyEmailController));


/**
 * Description: Forgot password
 * Path: /forgot-password
 * Method: POST
 * Request Body: { email: string }
 * Response: { message: string }
*/
usersRouter.post('/forgot-password', forgotPasswordValidation, wrapRequestHandler(forgotPasswordController));




/**
 * Description: Forgot password
 * Path: /forgot-password
 * Method: POST
 * Request Body: { email: string }
 * Response: { message: string }
*/
usersRouter.post('/verify-forgot-password', verifyForgotPasswordTokenValidation, wrapRequestHandler(verifyForgotPasswordTokenController));


/**
 * Description: Reset password
 * Path:/reset-password
 * Method: POST
 * Request Body: { forgot_password_token: string, assword: string, confirm_new_password: string }
 * Response: { message: string }
*/
usersRouter.post('/reset-password', resetPasswordValidation, wrapRequestHandler(resetPasswordController));



/**
 * Description: Get current logged-in user's information
 * Path: /me
 * Method: GET
 * Header: Authorization: Bearer <access_token>
 * Response: { message: string, result: User }
 */
usersRouter.get('/me', accessTokenValidation, wrapRequestHandler(getMeController));




/**
 * Description: Update current logged-in user's information
 * Path: /me
 * Method: PATCH
 * Header: Authorization: Bearer <access_token>
 * Response: { message: string, result: User }
 * Request Body: { User }
 */
usersRouter.patch('/me', accessTokenValidation, verifiedUserValidation, updateMeValidator, filterMiddleware<UpdateMeReqBody>(['name', 'date_of_birth', 'bio', 'location', 'website', 'cover_photo', 'avatar', 'username']), wrapRequestHandler(updateMeController));



/**
 * Description: Get user information by username
 * Path: /:username
 * Method: GET
 * Header: Authorization: Bearer <access_token
 * Response: { message: string, result: User }
 * Request Params: { username: string }
 */
usersRouter.get('/:username', wrapRequestHandler(getProfileController));


/**
 * Description: Follow someone 
 * Path: /follow
 * Method: POST
 * Header: Authorization: Bearer <access_token
 * Response: { message: string}
 * Request Body: { followUserId: string }
 */
usersRouter.post('/follow', accessTokenValidation, verifiedUserValidation, followValidation, wrapRequestHandler(followController));


/**
 * Description: Unfollow someone 
 * Path: /follow/userId
 * Method: DELETE
 * Header: Authorization: Bearer <access_token>
 * Response: { message: string}
 * Request Params: { userId: string }
 */
usersRouter.delete('/follow/:userId', accessTokenValidation, verifiedUserValidation, unfollowValidation, wrapRequestHandler(unfollowController));


/**
 * Description: Change password
 * Path: /change-password
 * Method: PUT
 * Header: Authorization: Bearer <access_token>
 * Request Body: { old_password: string, password: string, confirm_password: string }
 * Response: { message: string }
 */
usersRouter.put('/change-password', accessTokenValidation, verifiedUserValidation, changePasswordValidation, wrapRequestHandler(changePasswordController));

export default usersRouter;
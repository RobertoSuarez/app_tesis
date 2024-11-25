import { NextFunction, Request, Response, Router } from "express";
import { UserService } from "../../../../domain/services/user.service";



export class AuthRouter {

    public router: Router;

    constructor(
        private _userService: UserService,
    ) {
        this.router = Router();
        this.router.post('/login', this.login.bind(this));
    }


    async login(req: Request, res: Response, next: NextFunction) {

        try {
            const result = await this._userService.login(req.body.email, req.body.password);
            res.json({
                status: 'success',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }

}
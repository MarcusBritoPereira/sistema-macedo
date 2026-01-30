
import { Controller, Request, Post, UseGuards, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @UseGuards(ThrottlerGuard)
    @Post('login')
    async login(@Body() req) {
        const user = await this.authService.validateUser(req.email, req.senha);
        if (!user) {
            throw new UnauthorizedException('Credenciais inválidas');
        }
        return this.authService.login(user); // returns access_token
    }
}

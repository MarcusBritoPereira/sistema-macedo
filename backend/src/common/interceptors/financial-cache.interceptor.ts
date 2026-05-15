import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DreService } from '../../financial/dre/dre.service';

@Injectable()
export class FinancialCacheInterceptor implements NestInterceptor {
  constructor(private readonly dreService: DreService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only intercept mutations (and exclude DRE generation which is a POST)
    const isMutation = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method) && 
                      !request.url.includes('/financial/dre');

    return next.handle().pipe(
      tap(() => {
        if (isMutation) {
          console.log(`[FinancialCacheInterceptor] Invalidating DRE Cache due to ${method} on ${request.url}`);
          this.dreService.invalidarCacheDRE().catch(err => 
            console.error('[FinancialCacheInterceptor] Error invalidating cache:', err)
          );
        }
      }),
    );
  }
}

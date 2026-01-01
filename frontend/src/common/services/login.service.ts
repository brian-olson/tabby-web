import { BehaviorSubject, firstValueFrom, filter, take } from 'rxjs'
import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { User } from '../../api'


@Injectable({ providedIn: 'root' })
export class LoginService {
  user: User | null = null
  private _ready$ = new BehaviorSubject<boolean>(false)
  ready$ = this._ready$.pipe(filter(ready => ready), take(1))

  constructor (private http: HttpClient) {
    this.init()
  }

  async updateUser (): Promise<void> {
    if (!this.user) {
      return
    }
    await firstValueFrom(this.http.put('/api/1/user', this.user))
  }

  private async init () {
    try {
      this.user = await firstValueFrom(this.http.get<User>('/api/1/user'))
    } catch {
      // 403/401 means not authenticated - this is expected
      this.user = null
    }

    this._ready$.next(true)
  }
}

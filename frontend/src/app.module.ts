/* eslint-disable @typescript-eslint/no-extraneous-class */
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { ClipboardModule } from '@angular/cdk/clipboard'
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { HttpClientModule, provideHttpClient, withFetch } from '@angular/common/http'

import { AppComponent } from './app.component'
import { CommonAppModule } from 'src/common'

import '@fortawesome/fontawesome-svg-core/styles.css'

const ROUTES = [
  {
    path: '',
    loadChildren: () => import(/* webpackChunkName: "app" */'./app').then(m => m.ApplicationModule),
  },
  {
    path: 'app',
    redirectTo: '/',
  },
  {
    path: 'login',
    loadChildren: () => import(/* webpackChunkName: "login" */'./login').then(m => m.LoginModule),
  },
]

@NgModule({
  imports: [
    BrowserModule,
    CommonAppModule.forRoot(),
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    ClipboardModule,
    HttpClientModule,
    RouterModule.forRoot(ROUTES, {
      // Disable features that use Navigation API to prevent JIT compilation errors
      enableViewTransitions: false,
    }),
  ],
  declarations: [
    AppComponent,
  ],
  bootstrap: [AppComponent],
  providers: [
    provideHttpClient(withFetch()),
    // Provide Navigation as null to prevent JIT compilation errors
    { provide: 'Navigation', useValue: (typeof window !== 'undefined' ? window.navigation : null) },
  ],
})
export class AppModule { }

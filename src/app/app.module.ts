import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppCommonModule } from './app-common.module';

import { AppWrapperComponent } from './app-wrapper.component';
import { AppComponent } from './app.component';

import { environment } from '../environments/environment';

import { PROVIDERS } from './shared';

import { COMPONENTS, ENTRY_COMPONENTS } from './components';
import { ADMIN_COMPONENTS } from './+admin';
import { HOME_COMPONENTS } from './+home';
import { LANDING_COMPONENTS } from './+landing';
import { POLL_COMPONENTS } from './+poll';
import { JOIN_COMPONENTS } from './+join';

@NgModule({
  declarations: [
    AppWrapperComponent,
    AppComponent,

    ...COMPONENTS,
    ...ENTRY_COMPONENTS,

    ...ADMIN_COMPONENTS,
    ...HOME_COMPONENTS,
    ...LANDING_COMPONENTS,
    ...POLL_COMPONENTS,
    ...JOIN_COMPONENTS,
  ],
  entryComponents: [
    ...ENTRY_COMPONENTS,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    AppRoutingModule,

    AppCommonModule,
  ],
  providers: [
    ...PROVIDERS,
    Title,
  ],
  bootstrap: [AppWrapperComponent]
})
export class AppModule { }

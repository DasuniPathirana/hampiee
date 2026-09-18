import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, CartDrawerComponent],
  template: `
    <app-navbar />
    <app-cart-drawer />
    <main>
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [`main { min-height: calc(100vh - 4rem); }`]
})
export class App {
  title = 'Hampiee';
}

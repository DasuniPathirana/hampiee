import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class='container-hampiee py-20 text-center'>
      <h1 class='font-display text-3xl font-bold text-navy-900 mb-4'>My Account</h1>
      <p class='text-gray-400'>Account management coming soon.</p>
    </div>
  `
})
export class AccountComponent {}

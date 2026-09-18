import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cartcomponent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class='container-hampiee py-20 text-center'>
      <h1 class='font-display text-4xl font-bold text-navy-900 mb-4'></h1>
      <p class='text-gray-400 mb-8'>This page is coming soon.</p>
      <a routerLink='/' class='btn-primary'>Back to Home</a>
    </div>
  `
})
export class CartComponent {}

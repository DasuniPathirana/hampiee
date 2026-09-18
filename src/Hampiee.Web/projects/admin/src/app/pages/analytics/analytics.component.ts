import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-5">
      <h1 class="text-2xl font-bold text-navy-900"></h1>
      <div class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center text-gray-400">
        <p class="text-4xl mb-3">🚧</p>
        <p class="font-medium">Full implementation coming soon</p>
        <p class="text-sm">This section is being actively built</p>
      </div>
    </div>
  `
})
export class AnalyticsAdminComponent {}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-renew',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renew.html',
  styleUrl: './renew.css'
})
export class Renew implements OnInit {

  constructor(
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Initialize component
  }

  goBack() {
    this.location.back();
  }

  processRenewal() {
    // TODO: Implement renewal logic
    this.toastService.showSuccess('Success', 'Loan renewed successfully');
    this.goBack();
  }
}

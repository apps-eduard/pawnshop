import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-partial-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partial-payment.html',
  styleUrl: './partial-payment.css'
})
export class PartialPayment implements OnInit {

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

  processPayment() {
    // TODO: Implement partial payment logic
    this.toastService.showSuccess('Success', 'Partial payment processed successfully');
    this.goBack();
  }
}

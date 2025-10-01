import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-redeem',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './redeem.html',
  styleUrl: './redeem.css'
})
export class Redeem implements OnInit {

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

  processRedeem() {
    // TODO: Implement redeem logic
    this.toastService.showSuccess('Success', 'Item redeemed successfully');
    this.goBack();
  }
}

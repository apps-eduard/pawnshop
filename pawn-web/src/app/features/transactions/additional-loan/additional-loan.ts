import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-additional-loan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './additional-loan.html',
  styleUrl: './additional-loan.css'
})
export class AdditionalLoan implements OnInit {

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

  createAdditionalLoan() {
    // TODO: Implement additional loan logic
    this.toastService.showSuccess('Success', 'Additional loan created successfully');
    this.goBack();
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-new-loan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-loan.html',
  styleUrl: './new-loan.css'
})
export class NewLoan implements OnInit {

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

  createLoan() {
    // TODO: Implement loan creation logic
    this.toastService.showSuccess('Success', 'New loan created successfully');
    this.goBack();
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './error.html',
  styleUrl: './error.css'
})
export class ErrorComponent implements OnInit {
  errorCode: string = '404';
  errorTitle: string = 'Page Not Found';
  errorMessage: string = 'The page you are looking for does not exist or has been moved.';
  buttonText: string = 'Go Home';
  buttonLink: string = '/';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get error details from route data if provided
    this.route.data.subscribe(data => {
      if (data && data['errorCode']) {
        this.errorCode = data['errorCode'];
      }
      if (data && data['errorTitle']) {
        this.errorTitle = data['errorTitle'];
      }
      if (data && data['errorMessage']) {
        this.errorMessage = data['errorMessage'];
      }
      if (data && data['buttonText']) {
        this.buttonText = data['buttonText'];
      }
      if (data && data['buttonLink']) {
        this.buttonLink = data['buttonLink'];
      }
    });
  }

  navigateBack(): void {
    this.router.navigate([this.buttonLink]);
  }
}

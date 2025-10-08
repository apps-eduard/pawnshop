import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pawner-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pawner-dashboard.html',
  styleUrl: './pawner-dashboard.css'
})
export class PawnerDashboard implements OnInit {

  constructor() { }

  ngOnInit(): void {
    console.log('Pawner Dashboard initialized');
  }
}

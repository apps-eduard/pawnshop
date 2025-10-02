import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { SidebarComponent } from '../../../shared/sidebar/sidebar';

@Component({
  selector: 'app-pawner-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SidebarComponent],
  templateUrl: './pawner-dashboard.html',
  styleUrl: './pawner-dashboard.css'
})
export class PawnerDashboard implements OnInit {

  constructor() { }

  ngOnInit(): void {
    console.log('Pawner Dashboard initialized');
  }
}

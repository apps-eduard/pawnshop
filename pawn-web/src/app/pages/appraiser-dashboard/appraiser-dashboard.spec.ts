import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraiserDashboard } from './appraiser-dashboard';

describe('AppraiserDashboard', () => {
  let component: AppraiserDashboard;
  let fixture: ComponentFixture<AppraiserDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppraiserDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraiserDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

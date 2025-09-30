import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctioneerDashboard } from './auctioneer-dashboard';

describe('AuctioneerDashboard', () => {
  let component: AuctioneerDashboard;
  let fixture: ComponentFixture<AuctioneerDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuctioneerDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuctioneerDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

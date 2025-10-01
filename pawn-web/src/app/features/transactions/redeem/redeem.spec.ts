import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Redeem } from './redeem';

describe('Redeem', () => {
  let component: Redeem;
  let fixture: ComponentFixture<Redeem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Redeem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Redeem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

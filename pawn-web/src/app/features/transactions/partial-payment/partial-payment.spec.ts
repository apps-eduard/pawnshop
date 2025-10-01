import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartialPayment } from './partial-payment';

describe('PartialPayment', () => {
  let component: PartialPayment;
  let fixture: ComponentFixture<PartialPayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartialPayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartialPayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

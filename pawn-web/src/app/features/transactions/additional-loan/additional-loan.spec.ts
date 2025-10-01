import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdditionalLoan } from './additional-loan';

describe('AdditionalLoan', () => {
  let component: AdditionalLoan;
  let fixture: ComponentFixture<AdditionalLoan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdditionalLoan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdditionalLoan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

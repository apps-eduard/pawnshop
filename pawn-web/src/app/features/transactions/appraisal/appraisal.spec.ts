import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Appraisal } from './appraisal';

describe('Appraisal', () => {
  let component: Appraisal;
  let fixture: ComponentFixture<Appraisal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Appraisal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Appraisal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

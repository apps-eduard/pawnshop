import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Renew } from './renew';

describe('Renew', () => {
  let component: Renew;
  let fixture: ComponentFixture<Renew>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Renew]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Renew);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

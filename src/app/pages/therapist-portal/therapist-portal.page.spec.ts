import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TherapistPortalPage } from './therapist-portal.page';

describe('TherapistPortalPage', () => {
  let component: TherapistPortalPage;
  let fixture: ComponentFixture<TherapistPortalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TherapistPortalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

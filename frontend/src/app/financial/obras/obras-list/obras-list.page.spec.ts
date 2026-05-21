import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObrasListPage } from './obras-list.page';

describe('ObrasListPage', () => {
  let component: ObrasListPage;
  let fixture: ComponentFixture<ObrasListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ObrasListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

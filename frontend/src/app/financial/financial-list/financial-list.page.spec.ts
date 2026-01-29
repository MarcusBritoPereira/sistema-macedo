import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialListPage } from './financial-list.page';

describe('FinancialListPage', () => {
  let component: FinancialListPage;
  let fixture: ComponentFixture<FinancialListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FinancialListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

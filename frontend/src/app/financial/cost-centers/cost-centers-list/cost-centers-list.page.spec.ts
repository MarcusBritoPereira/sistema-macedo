import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CostCentersListPage } from './cost-centers-list.page';

describe('CostCentersListPage', () => {
  let component: CostCentersListPage;
  let fixture: ComponentFixture<CostCentersListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CostCentersListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

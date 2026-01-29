import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractsListPage } from './contracts-list.page';

describe('ContractsListPage', () => {
  let component: ContractsListPage;
  let fixture: ComponentFixture<ContractsListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ContractsListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
